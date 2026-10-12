// Supabase 연결. 서버(서버 컴포넌트, Server Action)에서만 불러 쓴다.
// 로그인한 사용자의 쿠키로 접속하므로, RLS에 따라 자기 데이터만 읽고 쓴다.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { MATERIAL_BUCKET, PAGE_SIZE, cleanLockTargets, type Goal, type KindFilter, type Proof } from "./goals";

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
    let query = supabase.from("goals").select(columns, { count: "exact", head });
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

// 오늘 화면용: 계획이 준비된 목표를 최근 것부터 가져온다.
export async function listPlannedGoals(limit = 12) {
  const { data, error } = await (await getSupabase()).from("goals").select(await goalColumns()).eq("plan_status", "ready").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`오늘 할 일 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as Goal[]).filter((goal) => goal.plan?.days);
}

export async function getGoal(id: string) {
  const { data, error } = await (await getSupabase()).from("goals").select(await goalColumns()).eq("id", id).maybeSingle();
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

export async function listProofs(filter: { goalId?: string; date?: string }) {
  let query = (await getSupabase()).from("proofs").select(PROOF_COLUMNS);
  if (filter.goalId) query = query.eq("goal_id", filter.goalId);
  if (filter.date) query = query.eq("date", filter.date);
  const { data, error } = await query.limit(1000);
  if (error) throw new Error(`인증 기록 조회 실패: ${error.message}`);
  return (data ?? []) as Proof[];
}
