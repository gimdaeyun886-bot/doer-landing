// 할 일(tasks) 데이터의 형태와 입력 규칙. 서버와 브라우저 양쪽에서 함께 쓴다.

export type Task = {
  id: string;
  title: string;
  goal: string;
  due_date: string; // YYYY-MM-DD
  estimated_minutes: number;
  memo: string | null;
  proof_path: string | null; // Storage 버킷 안의 파일 경로. null이면 인증 전.
  created_at: string;
  updated_at: string;
};

export type TaskValues = {
  title: string;
  goal: string;
  due_date: string;
  estimated_minutes: string;
  memo: string;
};

export type TaskField = keyof TaskValues | "proof";

export type FormState = {
  attempt: number;
  message?: string;
  errors?: Partial<Record<TaskField, string>>;
  values?: TaskValues;
};

export const PAGE_SIZE = 6;
export const PROOF_BUCKET = "task-proofs";
export const PROOF_MAX_BYTES = 3 * 1024 * 1024;
export const PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const LIMITS = { title: 60, goal: 30, memo: 300, minMinutes: 5, maxMinutes: 600 };

export const STATUS_FILTERS = [
  { value: "all", label: "전체" },
  { value: "todo", label: "인증 전" },
  { value: "verified", label: "인증 완료" },
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

export function proofError(file: { type: string; size: number }): string | null {
  if (!PROOF_TYPES[file.type]) return "JPG, PNG, WEBP 이미지만 올릴 수 있어요.";
  if (file.size > PROOF_MAX_BYTES) return "이미지는 3MB 이하만 올릴 수 있어요.";
  return null;
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readValues(formData: FormData): TaskValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    title: text("title"),
    goal: text("goal"),
    due_date: text("due_date"),
    estimated_minutes: text("estimated_minutes"),
    memo: text("memo"),
  };
}

export function validateValues(values: TaskValues) {
  const errors: Partial<Record<TaskField, string>> = {};
  if (!values.title) errors.title = "할 일을 입력해 주세요.";
  else if (values.title.length > LIMITS.title) errors.title = `할 일은 ${LIMITS.title}자 이하로 적어 주세요.`;

  if (!values.goal) errors.goal = "어떤 목표를 위한 일인지 입력해 주세요.";
  else if (values.goal.length > LIMITS.goal) errors.goal = `목표는 ${LIMITS.goal}자 이하로 적어 주세요.`;

  if (!values.due_date) errors.due_date = "날짜를 골라 주세요.";
  else if (!isRealDate(values.due_date)) errors.due_date = "날짜 형식이 올바르지 않아요. 예: 2026-10-20";

  const minutes = Number(values.estimated_minutes);
  if (!values.estimated_minutes) errors.estimated_minutes = "예상 시간을 분 단위로 입력해 주세요.";
  else if (!Number.isInteger(minutes)) errors.estimated_minutes = "예상 시간은 숫자(분)로만 입력해 주세요.";
  else if (minutes < LIMITS.minMinutes || minutes > LIMITS.maxMinutes)
    errors.estimated_minutes = `예상 시간은 ${LIMITS.minMinutes}분에서 ${LIMITS.maxMinutes}분 사이로 입력해 주세요.`;

  if (values.memo.length > LIMITS.memo) errors.memo = `메모는 ${LIMITS.memo}자 이하로 적어 주세요.`;
  return errors;
}

export function toValues(task: Task): TaskValues {
  return {
    title: task.title,
    goal: task.goal,
    due_date: task.due_date,
    estimated_minutes: String(task.estimated_minutes),
    memo: task.memo ?? "",
  };
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}분`;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

export function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}
