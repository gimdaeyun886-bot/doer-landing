// Supabase 연결과 조회. 서버(서버 컴포넌트, Server Action)에서만 불러 쓴다.
// 미션 6에는 로그인이 없다. 공개 키(publishable)로 접속하고, 모든 방문자가 하나의 데모 공간을 함께 쓴다.
// 사용자별 접근 제한(user_id + RLS)은 미션 7에서 붙인다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MATERIAL_BUCKET, PAGE_SIZE, cleanLockTargets, type Goal, type KindFilter, type Proof } from "./goals";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase가 안내하는 새 이름(publishable)과 예전 이름(anon)을 모두 받는다.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = () => Boolean(url && key);

// 테이블 이름. 같은 Supabase 프로젝트의 다른 데이터와 섞이지 않게 mission_ 을 붙였다.
export const TABLES = {
  goals: "mission_goals",
  proofs: "mission_proofs",
  settings: "mission_settings",
  adjustments: "mission_adjustments",
} as const;

let client: SupabaseClient | null = null;
export async function getSupabase() {
  if (!url || !key) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// 사진은 볼 때마다 한 시간 동안 쓸 수 있는 주소를 만든다.
export async function signedUrl(path: string | null) {
  if (!path) return null;
  const { data } = await (await getSupabase()).storage.from(MATERIAL_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export const GOAL_COLUMNS = "id,title,kind,deadline,daily_minutes,schedule,note,context,material_path,material_summary,plan,plan_status,plan_generated_at,created_at,updated_at";
export const goalColumns = async () => GOAL_COLUMNS;

export async function listGoals({ page, q, kind }: { page: number; q: string; kind: KindFilter }) {
  const supabase = await getSupabase();
  const from = (page - 1) * PAGE_SIZE;
  // PostgREST 필터 문법에 쓰이는 문자는 검색어에서 뺀다.
  const term = q.replace(/[,()%*\\"]/g, " ").trim();
  const filtered = (columns: string, head = false) => {
    let query = supabase.from(TABLES.goals).select(columns, { count: "exact", head });
    if (kind !== "all") query = query.eq("kind", kind);
    if (term) query = query.ilike("title", `%${term}%`);
    return query;
  };
  const { data, count, error } = await filtered(GOAL_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id")
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
  const { data, error } = await (await getSupabase()).from(TABLES.goals).select(GOAL_COLUMNS).eq("plan_status", "ready").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`오늘 할 일 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as Goal[]).filter((goal) => goal.plan?.days);
}

export async function getGoal(id: string) {
  const { data, error } = await (await getSupabase()).from(TABLES.goals).select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`상세 조회 실패: ${error.message}`);
  return data as unknown as Goal | null;
}

export type Settings = { lockTargets: string[]; lockDate: string | null };

// 잠글 앱과 오늘의 잠금 상태. 데모 공간에 한 줄(id = 1)만 둔다.
export async function getSettings(): Promise<Settings> {
  const { data, error } = await (await getSupabase()).from(TABLES.settings).select("lock_targets,lock_date").eq("id", 1).maybeSingle();
  if (error) throw new Error(`설정 조회 실패: ${error.message}`);
  return { lockTargets: cleanLockTargets((data?.lock_targets as string[] | undefined) ?? []), lockDate: (data?.lock_date as string | null | undefined) ?? null };
}

export async function saveSettings(patch: { lock_targets?: string[]; lock_date?: string | null }) {
  const row = { id: 1, updated_at: new Date().toISOString(), ...patch, ...(patch.lock_targets ? { lock_targets: cleanLockTargets(patch.lock_targets) } : {}) };
  const { error } = await (await getSupabase()).from(TABLES.settings).upsert(row);
  if (error) console.error("settings save failed:", error.message);
  return !error;
}

const PROOF_COLUMNS = "goal_id,task_id,date,kind,passed,reason,image_path,appeal,created_at";

export async function listProofs(filter: { goalId?: string; date?: string }) {
  let query = (await getSupabase()).from(TABLES.proofs).select(PROOF_COLUMNS);
  if (filter.goalId) query = query.eq("goal_id", filter.goalId);
  if (filter.date) query = query.eq("date", filter.date);
  const { data, error } = await query.limit(1000);
  if (error) throw new Error(`인증 기록 조회 실패: ${error.message}`);
  return (data ?? []) as Proof[];
}
