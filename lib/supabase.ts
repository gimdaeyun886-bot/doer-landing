// Supabase 연결. 서버(서버 컴포넌트, Server Action)에서만 불러 쓴다.
import { createClient } from "@supabase/supabase-js";
import { PAGE_SIZE, PROOF_BUCKET, type StatusFilter, type Task } from "./tasks";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase가 안내하는 새 이름(publishable)과 예전 이름(anon)을 모두 받는다.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = () => Boolean(url && key);

export function getSupabase() {
  if (!url || !key) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function proofUrl(path: string) {
  return `${url}/storage/v1/object/public/${PROOF_BUCKET}/${path}`;
}

const COLUMNS = "id,title,goal,due_date,estimated_minutes,memo,proof_path,created_at,updated_at";

export async function listTasks({ page, q, status }: { page: number; q: string; status: StatusFilter }) {
  const from = (page - 1) * PAGE_SIZE;
  // PostgREST 필터 문법에 쓰이는 문자는 검색어에서 뺀다.
  const term = q.replace(/[,()%*\\"]/g, " ").trim();
  const filtered = (columns: string, head = false) => {
    let query = getSupabase().from("tasks").select(columns, { count: "exact", head });
    if (status === "todo") query = query.is("proof_path", null);
    if (status === "verified") query = query.not("proof_path", "is", null);
    if (term) query = query.or(`title.ilike.%${term}%,goal.ilike.%${term}%`);
    return query;
  };
  const { data, count, error } = await filtered(COLUMNS)
    .order("due_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (!error) return { tasks: (data ?? []) as unknown as Task[], total: count ?? 0 };
  // 범위를 벗어난 페이지(PGRST103)는 개수만 다시 세어 돌려주고, 호출한 쪽이 마지막 페이지로 보낸다.
  if (error.code !== "PGRST103") throw new Error(`목록 조회 실패: ${error.message}`);
  const counted = await filtered("id", true);
  if (counted.error) throw new Error(`개수 조회 실패: ${counted.error.message}`);
  return { tasks: [] as Task[], total: counted.count ?? 0 };
}

export async function getTask(id: string) {
  const { data, error } = await getSupabase().from("tasks").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`상세 조회 실패: ${error.message}`);
  return data as Task | null;
}
