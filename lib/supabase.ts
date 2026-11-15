// Supabase 연결. 서버(서버 컴포넌트, Server Action)에서만 불러 쓴다.
// 로그인한 사용자의 쿠키로 접속하므로, RLS에 따라 자기 데이터만 읽고 쓴다.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { MATERIAL_BUCKET, PAGE_SIZE, TRASH_DAYS, addDays, cleanLockTargets, planEndState, tasksOn, todayInSeoul, type Goal, type KindFilter, type Proof } from "./goals";
import { canRepair, findMissed, type RecoveryRow } from "./recover";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase가 안내하는 새 이름(publishable)과 예전 이름(anon)을 모두 받는다.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = () => Boolean(url && key);

// 한 요청 안에서는 같은 연결을 돌려쓴다.
export const getSupabase = cache(async () => {
  if (!url || !key) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts가 맡는다.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
});

export const getUser = cache(async () => {
  if (!isConfigured()) return null;
  // 요청마다 인증 서버를 다시 부르지 않는다. 데이터는 RLS가 토큰을 검증해 지킨다.
  const { data } = await (await getSupabase()).auth.getSession();
  return data.session?.user ?? null;
});

// 저장소는 비공개라, 볼 때마다 잠깐 쓸 수 있는 주소를 만든다.
export async function signedUrl(path: string | null) {
  if (!path) return null;
  const { data } = await (await getSupabase()).storage.from(MATERIAL_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

const BASE_COLUMNS = "id,title,kind,deadline,daily_minutes,schedule,note,material_path,material_summary,plan,plan_status,plan_generated_at,created_at,updated_at";

// context 칸은 나중에 더한 것이라(supabase/migrations), 아직 없는 DB에서도 앱이 돌게 한 번 확인해 둔다.
let contextReady: Promise<boolean> | null = null;
export function hasContext() {
  contextReady ??= (async () => {
    const { error } = await (await getSupabase()).from("goals").select("context").limit(1);
    if (error && error.code !== "42703") contextReady = null; // 다른 이유의 실패는 다음에 다시 확인한다.
    return !error;
  })();
  return contextReady;
}
export const goalColumns = async () => ((await hasContext()) ? `${BASE_COLUMNS},context` : BASE_COLUMNS);

export async function listGoals({ page, q, kind }: { page: number; q: string; kind: KindFilter }) {
  const supabase = await getSupabase();
  const columns = await goalColumns();
  const from = (page - 1) * PAGE_SIZE;
  // PostgREST 필터 문법에 쓰이는 문자는 검색어에서 뺀다.
  const term = q.replace(/[,()%*\\"]/g, " ").trim();
  const filtered = (columns: string, head = false) => {
    let query = supabase.from("goals").select(columns, { count: "exact", head }).is("deleted_at", null);
    if (kind !== "all") query = query.eq("kind", kind);
    if (term) query = query.ilike("title", `%${term}%`);
    return query;
  };
  const { data, count, error } = await filtered(columns)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (!error) return { goals: (data ?? []) as unknown as Goal[], total: count ?? 0 };
  // 범위를 벗어난 페이지(PGRST103)는 개수만 다시 세어 돌려주고, 호출한 쪽이 마지막 페이지로 보낸다.
  if (error.code !== "PGRST103") throw new Error(`목록 조회 실패: ${error.message}`);
  const counted = await filtered("id", true);
  if (counted.error) throw new Error(`개수 조회 실패: ${counted.error.message}`);
  return { goals: [] as Goal[], total: counted.count ?? 0 };
}

// 오늘 화면용: 계획이 준비된 목표를 최근 것부터 가져온다. 끝난 목표도 기록 계산에 쓰이므로 넉넉히 읽는다.
export async function listPlannedGoals(limit = 40) {
  const { data, error } = await (await getSupabase()).from("goals").select(await goalColumns()).eq("plan_status", "ready").is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`오늘 할 일 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as Goal[]).filter((goal) => goal.plan?.days);
}

// 계획이 없는 목표 하나(만들지 못했거나, 목표일까지 인증이 없어 지운 것). 오늘 화면이 그 목표로 안내할 때 쓴다.
export type Unplanned = { id: string; title: string; expired: boolean };
export async function firstUnplannedGoal(): Promise<Unplanned | null> {
  const { data } = await (await getSupabase()).from("goals").select("id,title,plan_status").neq("plan_status", "ready").is("deleted_at", null).order("created_at", { ascending: false }).limit(1);
  const row = data?.[0];
  return row ? { id: row.id as string, title: row.title as string, expired: row.plan_status === "expired" } : null;
}

export async function getGoal(id: string) {
  const { data, error } = await (await getSupabase()).from("goals").select(await goalColumns()).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(`상세 조회 실패: ${error.message}`);
  return data as unknown as Goal | null;
}

export type Settings = { lockTargets: string[]; lockDate: string | null };

// 잠글 앱과 오늘의 잠금 상태. 목표가 아니라 사용자 한 명에게 한 벌이다.
export async function getSettings(): Promise<Settings> {
  const { data, error } = await (await getSupabase()).from("app_settings").select("lock_targets,lock_date").maybeSingle();
  if (error) throw new Error(`설정 조회 실패: ${error.message}`);
  return { lockTargets: cleanLockTargets((data?.lock_targets as string[] | undefined) ?? []), lockDate: (data?.lock_date as string | null | undefined) ?? null };
}

export async function saveSettings(patch: { lock_targets?: string[]; lock_date?: string | null }) {
  const user = await getUser();
  if (!user) return false;
  const row = { user_id: user.id, updated_at: new Date().toISOString(), ...patch, ...(patch.lock_targets ? { lock_targets: cleanLockTargets(patch.lock_targets) } : {}) };
  const { error } = await (await getSupabase()).from("app_settings").upsert(row);
  if (error) console.error("settings save failed:", error.message);
  return !error;
}

const PROOF_COLUMNS = "goal_id,task_id,date,kind,passed,reason,image_path,appeal,created_at";

// 오늘 아직 인증하지 않은 할 일의 수. 조정은 이것이 있을 때만 받는다.
export async function todayLeft() {
  const today = todayInSeoul();
  const [goals, proofs] = await Promise.all([listPlannedGoals(), listProofs({ date: today })]);
  const passed = new Set(proofs.filter((proof) => proof.passed).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  return goals.flatMap((goal) => tasksOn(goal, today).map((task) => `${goal.id}:${task.id}`)).filter((key) => !passed.has(key)).length;
}

// 지금 잠금이 걸려 있는지: 오늘 시작했고, 잠글 앱이 있고, 아직 인증하지 않은 할 일이 남았다.
// 잠긴 동안에는 오늘 할 일이나 잠글 앱을 바꾸는 동작(목표 삭제·수정, 계획 다시 만들기, 잠글 앱 저장)을 막는다.
export async function lockedNow() {
  const today = todayInSeoul();
  const settings = await getSettings();
  if (settings.lockDate !== today || !settings.lockTargets.length) return false;
  const [goals, proofs] = await Promise.all([listPlannedGoals(), listProofs({ date: today })]);
  const passed = new Set(proofs.filter((proof) => proof.passed).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  return goals.some((goal) => tasksOn(goal, today).some((task) => !passed.has(`${goal.id}:${task.id}`)));
}

// 연속 기록과 기록 화면용: 그날부터의 인증 기록, 조정한 날, 놓친 날을 정리한 기록.
// recovered가 null이면 놓친 날 정리용 칸이 아직 없는 DB다(supabase/migrations/2026-11-12-recover.sql을 돌리기 전).
export async function listHistory(from: string) {
  const supabase = await getSupabase();
  const [proofs, adjustments] = await Promise.all([
    supabase.from("proofs").select(PROOF_COLUMNS).gte("date", from).limit(2000),
    supabase.from("adjustments").select("date,kind,for_date,repairs").or(`date.gte.${from},for_date.gte.${from}`).limit(500),
  ]);
  if (proofs.error) throw new Error(`인증 기록 조회 실패: ${proofs.error.message}`);
  let rows = (adjustments.data ?? []) as { date: string; kind?: string; for_date?: string | null; repairs?: boolean }[];
  let ready = !adjustments.error;
  if (adjustments.error) {
    if (adjustments.error.code !== "42703") console.error("adjustments read failed:", adjustments.error.message);
    const old = await supabase.from("adjustments").select("date").gte("date", from).limit(500);
    rows = (old.data ?? []) as { date: string }[];
    ready = false;
  }
  const recoveries: RecoveryRow[] = rows.filter((row) => row.kind === "recover" && row.for_date).map((row) => ({ for_date: row.for_date as string, repairs: Boolean(row.repairs) }));
  return {
    proofs: (proofs.data ?? []) as Proof[],
    adjusted: new Set(rows.filter((row) => (row.kind ?? "adjust") === "adjust").map((row) => row.date)),
    recovered: ready ? recoveries : null,
    repairs: new Set(recoveries.filter((row) => row.repairs).map((row) => row.for_date)),
  };
}

export async function listProofs(filter: { goalId?: string; date?: string }) {
  let query = (await getSupabase()).from("proofs").select(PROOF_COLUMNS);
  if (filter.goalId) query = query.eq("goal_id", filter.goalId);
  if (filter.date) query = query.eq("date", filter.date);
  const { data, error } = await query.limit(1000);
  if (error) throw new Error(`인증 기록 조회 실패: ${error.message}`);
  return (data ?? []) as Proof[];
}

// 놓친 날 이어 가기에 필요한 것을 한 번에 읽는다. ready가 false면 DB에 정리용 칸이 아직 없다.
export async function recoveryState() {
  const today = todayInSeoul();
  const [goals, history] = await Promise.all([listPlannedGoals(), listHistory(addDays(today, -120))]);
  const resolved = new Set((history.recovered ?? []).map((row) => row.for_date));
  const missed = history.recovered ? findMissed(goals, history.proofs, resolved, today) : [];
  const passedToday = new Set(history.proofs.filter((proof) => proof.passed && proof.date === today).map((proof) => `${proof.goal_id}:${proof.task_id}`));
  const todayOpen = goals.some((goal) => tasksOn(goal, today).some((task) => !passedToday.has(`${goal.id}:${task.id}`)));
  return {
    ready: Boolean(history.recovered),
    ctx: { goals, missed, today, todayOpen },
    repairOk: canRepair(history.recovered ?? [], today),
    history,
  };
}

/* ───────── 휴지통과 끝난 계획 정리 ───────── */

export type TrashedGoal = { id: string; title: string; deleted_at: string };

// 휴지통에 든 목표. 지운 지 오래된 것부터 위에 둔다(먼저 사라질 것).
export async function listTrash() {
  const { data, error } = await (await getSupabase()).from("goals").select("id,title,deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: true }).limit(100);
  if (error) throw new Error(`휴지통 조회 실패: ${error.message}`);
  return (data ?? []) as TrashedGoal[];
}

export async function trashCount() {
  const { count } = await (await getSupabase()).from("goals").select("id", { count: "exact", head: true }).not("deleted_at", "is", null);
  return count ?? 0;
}

// 목표를 완전히 지운다. 인증 기록은 DB가 함께 지우고(on delete cascade), 올린 자료와 인증 사진 파일은 여기서 지운다.
export async function purgeGoals(ids: string[]) {
  if (!ids.length) return true;
  const supabase = await getSupabase();
  const [goals, proofs] = await Promise.all([
    supabase.from("goals").select("material_path").in("id", ids),
    supabase.from("proofs").select("image_path").in("goal_id", ids).not("image_path", "is", null),
  ]);
  const paths = [...(goals.data ?? []).map((row) => row.material_path as string | null), ...(proofs.data ?? []).map((row) => row.image_path as string | null)].filter((path): path is string => Boolean(path));
  const { error } = await supabase.from("goals").delete().in("id", ids);
  if (error) {
    console.error("goal purge failed:", error.message);
    return false;
  }
  if (paths.length) {
    const removed = await supabase.storage.from(MATERIAL_BUCKET).remove(paths);
    if (removed.error) console.error("goal files purge failed:", removed.error.message);
  }
  return true;
}

// 화면을 열 때 서버에서 한 번 정리한다. 실패해도 화면은 그대로 연다.
// 1) 휴지통에 30일 넘게 있던 목표를 완전히 지운다.
// 2) 날짜 있는·완성 목표가 목표일까지 인증 하나 없이 끝났으면 계획만 지운다(목표는 남김. lib/goals.ts의 planEndState).
export const sweepGoals = cache(async () => {
  try {
    const supabase = await getSupabase();
    const cutoff = new Date(Date.now() - TRASH_DAYS * 86_400_000).toISOString();
    const { data: old } = await supabase.from("goals").select("id").not("deleted_at", "is", null).lt("deleted_at", cutoff).limit(50);
    if (old?.length) await purgeGoals(old.map((row) => row.id as string));

    const today = todayInSeoul();
    const { data: ready } = await supabase.from("goals").select("id,kind,deadline,plan,plan_status").eq("plan_status", "ready").is("deleted_at", null).neq("kind", "ongoing").limit(100);
    const ended = ((ready ?? []) as unknown as Goal[]).filter((goal) => planEndState(goal, new Set(), today) === "expired").map((goal) => goal.id);
    if (!ended.length) return;
    const { data: proofs } = await supabase.from("proofs").select("goal_id").in("goal_id", ended).eq("passed", true);
    const kept = new Set((proofs ?? []).map((row) => row.goal_id as string));
    const expire = ended.filter((id) => !kept.has(id));
    if (!expire.length) return;
    const { error } = await supabase.from("goals").update({ plan: null, plan_status: "expired" }).in("id", expire).eq("plan_status", "ready");
    if (error) console.error("plan expire failed:", error.message);
    else console.info(`plans expired: ${expire.length}`);
  } catch (error) {
    console.error("goal sweep failed:", error instanceof Error ? error.message : error);
  }
});
