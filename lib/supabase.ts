// Supabase 연결. 서버(서버 컴포넌트, Server Action)에서만 불러 쓴다.
import { createClient } from "@supabase/supabase-js";
import { MATERIAL_BUCKET, PAGE_SIZE, cleanLockTargets, type Goal, type KindFilter, type Proof } from "./goals";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase가 안내하는 새 이름(publishable)과 예전 이름(anon)을 모두 받는다.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = () => Boolean(url && key);

export function getSupabase() {
  if (!url || !key) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function materialUrl(path: string) {
  return `${url}/storage/v1/object/public/${MATERIAL_BUCKET}/${path}`;
}

export const GOAL_COLUMNS = "id,title,kind,deadline,daily_minutes,schedule,note,material_path,material_summary,plan,plan_status,plan_generated_at,created_at,updated_at";

export async function listGoals({ page, q, kind }: { page: number; q: string; kind: KindFilter }) {
  const from = (page - 1) * PAGE_SIZE;
  // PostgREST 필터 문법에 쓰이는 문자는 검색어에서 뺀다.
  const term = q.replace(/[,()%*\\"]/g, " ").trim();
  const filtered = (columns: string, head = false) => {
    let query = getSupabase().from("goals").select(columns, { count: "exact", head });
    if (kind !== "all") query = query.eq("kind", kind);
    if (term) query = query.ilike("title", `%${term}%`);
    return query;
  };
  const { data, count, error } = await filtered(GOAL_COLUMNS)
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
  const { data, error } = await getSupabase().from("goals").select(GOAL_COLUMNS).eq("plan_status", "ready").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`오늘 할 일 조회 실패: ${error.message}`);
  return (data ?? []) as unknown as Goal[];
}

export async function getGoal(id: string) {
  const { data, error } = await getSupabase().from("goals").select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`상세 조회 실패: ${error.message}`);
  return data as unknown as Goal | null;
}

// 잠글 앱. 목표가 아니라 사용자 한 명에게 한 벌이다.
export async function getLockTargets() {
  const { data, error } = await getSupabase().from("app_settings").select("lock_targets").eq("id", 1).maybeSingle();
  if (error) throw new Error(`설정 조회 실패: ${error.message}`);
  return cleanLockTargets((data?.lock_targets as string[] | undefined) ?? []);
}

export async function saveLockTargets(lockTargets: string[]) {
  const { error } = await getSupabase().from("app_settings").upsert({ id: 1, lock_targets: cleanLockTargets(lockTargets), updated_at: new Date().toISOString() });
  if (error) console.error("lock targets save failed:", error.message);
}

const PROOF_COLUMNS = "goal_id,task_id,date,passed,reason,image_path,created_at";

export async function listProofs(filter: { goalId?: string; date?: string }) {
  let query = getSupabase().from("proofs").select(PROOF_COLUMNS);
  if (filter.goalId) query = query.eq("goal_id", filter.goalId);
  if (filter.date) query = query.eq("date", filter.date);
  const { data, error } = await query.limit(1000);
  if (error) throw new Error(`인증 기록 조회 실패: ${error.message}`);
  return (data ?? []) as Proof[];
}
