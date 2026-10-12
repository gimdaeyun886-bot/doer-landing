// 목표(goals) 데이터의 형태와 입력 규칙. 서버와 브라우저 양쪽에서 함께 쓴다.

// AI가 만든 오늘 할 일 하나. 사용자는 이 내용을 직접 고치지 않는다.
export type PlanTask = {
  title: string;
  minutes: number;
  detail: string;
  verify_method: string; // 이 과제에 맞춰 AI가 고른 인증 방법
  verify_guide: string;
};

export type PlanWeek = { week: number; focus: string; items: string[] };

export type Plan = { summary: string; weeks: PlanWeek[]; today: PlanTask[] };

export type PlanStatus = "pending" | "ready" | "failed";

export type Goal = {
  id: string;
  title: string;
  exam_date: string | null; // YYYY-MM-DD. null이면 기한 없는 목표.
  daily_minutes: number;
  note: string | null;
  material_path: string | null; // Storage 버킷 안의 파일 경로
  plan: Plan | null;
  plan_status: PlanStatus;
  plan_generated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalValues = {
  title: string;
  exam_date: string;
  no_deadline: boolean;
  daily_minutes: string;
  note: string;
};

export type GoalField = "title" | "exam_date" | "daily_minutes" | "note" | "material";

export type FormState = {
  attempt: number;
  message?: string;
  errors?: Partial<Record<GoalField, string>>;
  values?: GoalValues;
};

export const PAGE_SIZE = 6;
export const MATERIAL_BUCKET = "goal-materials";
export const MATERIAL_MAX_BYTES = 3 * 1024 * 1024;
export const MATERIAL_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const LIMITS = { title: 40, note: 300, minMinutes: 10, maxMinutes: 600 };
export const MINUTE_PRESETS = [30, 45, 60, 90, 120];

export const DEADLINE_FILTERS = [
  { value: "all", label: "전체" },
  { value: "dated", label: "시험일 있음" },
  { value: "open", label: "기한 없음" },
] as const;
export type DeadlineFilter = (typeof DEADLINE_FILTERS)[number]["value"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

export function materialError(file: { type: string; size: number }): string | null {
  if (!MATERIAL_TYPES[file.type]) return "JPG, PNG, WEBP 이미지만 올릴 수 있어요.";
  if (file.size > MATERIAL_MAX_BYTES) return "이미지는 3MB 이하만 올릴 수 있어요.";
  return null;
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// 오늘부터 시험일까지 남은 날 수. 오늘이 시험일이면 0.
export function daysLeft(examDate: string) {
  return Math.round((Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${todayInSeoul()}T00:00:00Z`)) / 86_400_000);
}

export function deadlineLabel(examDate: string | null) {
  if (!examDate) return "기한 없음";
  const left = daysLeft(examDate);
  if (left < 0) return "시험일 지남";
  return left === 0 ? "D-DAY" : `D-${left}`;
}

export function readValues(formData: FormData): GoalValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  return {
    title: text("title"),
    exam_date: text("exam_date"),
    no_deadline: formData.get("no_deadline") === "on",
    daily_minutes: text("daily_minutes"),
    note: text("note"),
  };
}

export function validateValues(values: GoalValues) {
  const errors: Partial<Record<GoalField, string>> = {};
  if (!values.title) errors.title = "어떤 시험이나 목표인지 적어 주세요.";
  else if (values.title.length > LIMITS.title) errors.title = `목표는 ${LIMITS.title}자 이하로 적어 주세요.`;

  if (!values.no_deadline) {
    if (!values.exam_date) errors.exam_date = "시험일을 고르거나 '기한 없이 할 목표'를 선택해 주세요.";
    else if (!isRealDate(values.exam_date)) errors.exam_date = "날짜 형식이 올바르지 않아요. 예: 2026-11-15";
    else if (daysLeft(values.exam_date) < 0) errors.exam_date = "시험일은 오늘이거나 오늘 이후여야 해요.";
    else if (daysLeft(values.exam_date) > 730) errors.exam_date = "시험일은 2년 이내로 골라 주세요.";
  }

  const minutes = Number(values.daily_minutes);
  if (!values.daily_minutes) errors.daily_minutes = "하루에 낼 수 있는 시간을 분 단위로 입력해 주세요.";
  else if (!Number.isInteger(minutes)) errors.daily_minutes = "시간은 숫자(분)로만 입력해 주세요.";
  else if (minutes < LIMITS.minMinutes || minutes > LIMITS.maxMinutes)
    errors.daily_minutes = `하루 시간은 ${LIMITS.minMinutes}분에서 ${LIMITS.maxMinutes}분 사이로 입력해 주세요.`;

  if (values.note.length > LIMITS.note) errors.note = `메모는 ${LIMITS.note}자 이하로 적어 주세요.`;
  return errors;
}

export function toValues(goal: Goal): GoalValues {
  return {
    title: goal.title,
    exam_date: goal.exam_date ?? "",
    no_deadline: !goal.exam_date,
    daily_minutes: String(goal.daily_minutes),
    note: goal.note ?? "",
  };
}

// 버거운 날 계획을 조정하면 생기는 대가. 사업 규칙이라 AI가 아니라 코드가 정한다.
export function adjustmentRule(examDate: string | null) {
  return examDate
    ? "시험일이 정해져 있어요. 조정해서 못 한 분량은 남은 날에 나뉘어 더해져요."
    : "기한이 없는 목표예요. 조정하면 그만큼 완료 예정일이 뒤로 밀려요.";
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
