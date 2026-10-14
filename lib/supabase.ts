// Supabase 연결과 조회. 서버(서버 컴포넌트, Server Action)에서만 불러 쓴다.
// 미션 6에는 로그인이 없어서 공개 키(publishable)로 접속한다. 사용자별 권한은 미션 7에서 RLS로 붙인다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GOAL_COLUMNS, MATERIAL_BUCKET, PAGE_SIZE, todayInSeoul, type Goal, type KindFilter, type Sort } from "./goals";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase가 안내하는 새 이름(publishable)과 예전 이름(anon)을 모두 받는다.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = () => Boolean(url && key);

let client: SupabaseClient | null = null;
export function getSupabase() {
  if (!url || !key) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export const TABLE = "mission_goals";

// 버킷이 공개라 주소만 만들면 된다. 바꾼 사진이 예전 것으로 보이지 않게 수정 시각을 붙인다.
export function materialUrl(goal: Pick<Goal, "material_path" | "updated_at">) {
  if (!goal.material_path) return null;
  const { data } = getSupabase().storage.from(MATERIAL_BUCKET).getPublicUrl(goal.material_path);
  return `${data.publicUrl}?v=${Date.parse(goal.updated_at)}`;
}

export async function listGoals({ page, q, kind, sort }: { page: number; q: string; kind: KindFilter; sort: Sort }) {
  const from = (page - 1) * PAGE_SIZE;
  // PostgREST 필터 문법에 쓰이는 문자는 검색어에서 뺀다.
  const term = q.replace(/[,()%*\\"]/g, " ").trim();
  const filtered = (columns: string, head = false) => {
    let query = getSupabase().from(TABLE).select(columns, { count: "exact", head });
    if (kind !== "all") query = query.eq("kind", kind);
    if (term) query = query.ilike("title", `%${term}%`);
    return query;
  };
  let ordered = filtered(GOAL_COLUMNS);
  // 목표일 순: 날짜 있는 목표를 가까운 날부터, 날짜 없는 목표는 그 뒤에 최근 것부터.
  if (sort === "deadline") ordered = ordered.order("deadline", { ascending: true, nullsFirst: false });
  const { data, count, error } = await ordered
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

export async function getGoal(id: string) {
  const { data, error } = await getSupabase().from(TABLE).select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`상세 조회 실패: ${error.message}`);
  return data as unknown as Goal | null;
}

// 목록 위의 한 줄 요약: 전체 개수와 가장 가까운 목표일.
export async function goalSummary() {
  const supabase = getSupabase();
  const [all, next] = await Promise.all([
    supabase.from(TABLE).select("id", { count: "exact", head: true }),
    supabase.from(TABLE).select("title,deadline").eq("kind", "dated").gte("deadline", todayInSeoul()).order("deadline").limit(1).maybeSingle(),
  ]);
  if (all.error) throw new Error(`개수 조회 실패: ${all.error.message}`);
  return { total: all.count ?? 0, next: (next.data as { title: string; deadline: string } | null) ?? null };
}
