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

// 목표의 모양. 조정했을 때의 대가가 이 값에 따라 달라진다.
export const KINDS = [
  { value: "dated", label: "날짜가 있어요", short: "날짜 있음" },
  { value: "finish", label: "날짜 없이 끝까지", short: "기한 없음" },
  { value: "ongoing", label: "계속 이어 가요", short: "계속 이어 가기" },
] as const;
export type GoalKind = (typeof KINDS)[number]["value"];
export const isKind = (value: unknown): value is GoalKind => KINDS.some((kind) => kind.value === value);

export type Goal = {
  id: string;
  title: string;
  kind: GoalKind;
  deadline: string | null; // YYYY-MM-DD. kind가 dated일 때만 있다.
  daily_minutes: number;
  note: string | null;
  lock_targets: string[];
  material_path: string | null; // Storage 버킷 안의 파일 경로
  plan: Plan | null;
  plan_status: PlanStatus;
  plan_generated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalValues = {
  title: string;
  kind: GoalKind;
  deadline: string;
  daily_minutes: string;
  note: string;
  lock_targets: string[];
};

export type GoalField = "title" | "deadline" | "daily_minutes" | "note" | "lock_targets" | "material";

export type FormState = {
  attempt: number;
  message?: string;
  errors?: Partial<Record<GoalField, string>>;
  values?: GoalValues;
};

export const EMPTY_VALUES: GoalValues = { title: "", kind: "dated", deadline: "", daily_minutes: "", note: "", lock_targets: [] };

export const PAGE_SIZE = 5;
export const MATERIAL_BUCKET = "goal-materials";
export const MATERIAL_MAX_BYTES = 3 * 1024 * 1024;
export const MATERIAL_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const LIMITS = { title: 40, note: 300, minMinutes: 10, maxMinutes: 600, lockCount: 8, lockLength: 16 };
export const LOCK_PRESETS = ["릴스", "쇼츠", "스토리", "게임"];

export const KIND_FILTERS = [{ value: "all", label: "전체" }, ...KINDS.map((kind) => ({ value: kind.value, label: kind.short }))] as const;
export type KindFilter = "all" | GoalKind;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

export function materialError(file: { type: string; size: number }): string | null {
  if (!MATERIAL_TYPES[file.type]) return "JPG, PNG, WEBP 이미지만 올릴 수 있어요.";
  if (file.size > MATERIAL_MAX_BYTES) return "이미지는 3MB 이하만 올릴 수 있어요.";
  return null;
}

export function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// 오늘부터 그 날짜까지 남은 날 수. 오늘이면 0.
export function daysLeft(date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayInSeoul()}T00:00:00Z`)) / 86_400_000);
}

// 목록과 상세에서 목표 옆에 붙는 짧은 표시.
export function goalTag(goal: Pick<Goal, "kind" | "deadline">) {
  if (goal.kind === "ongoing") return "계속 이어 가기";
  if (goal.kind === "finish" || !goal.deadline) return "기한 없음";
  const left = daysLeft(goal.deadline);
  if (left < 0) return "날짜 지남";
  return left === 0 ? "D-DAY" : `D-${left}`;
}

export function cleanLockTargets(items: string[]) {
  const seen = new Set<string>();
  for (const item of items) {
    const text = item.trim().slice(0, LIMITS.lockLength);
    if (text) seen.add(text);
  }
  return [...seen].slice(0, LIMITS.lockCount);
}

export function readValues(formData: FormData): GoalValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const kind = text("kind");
  const picked = formData.getAll("lock").map(String);
  const custom = text("lock_custom").split(/[,·、]/);
  return {
    title: text("title"),
    kind: isKind(kind) ? kind : "dated",
    deadline: text("deadline"),
    daily_minutes: text("daily_minutes"),
    note: text("note"),
    lock_targets: cleanLockTargets([...picked, ...custom]),
  };
}

export function validateValues(values: GoalValues) {
  const errors: Partial<Record<GoalField, string>> = {};
  if (!values.title) errors.title = "무엇을 해내고 싶은지 적어 주세요.";
  else if (values.title.length > LIMITS.title) errors.title = `목표는 ${LIMITS.title}자 이하로 적어 주세요.`;

  if (values.kind === "dated") {
    if (!values.deadline) errors.deadline = "날짜를 고르거나, 날짜가 없으면 다른 종류를 골라 주세요.";
    else if (!isRealDate(values.deadline)) errors.deadline = "날짜 형식이 올바르지 않아요. 예: 2026-11-15";
    else if (daysLeft(values.deadline) < 0) errors.deadline = "오늘이거나 오늘 이후의 날짜여야 해요.";
    else if (daysLeft(values.deadline) > 730) errors.deadline = "2년 이내의 날짜로 골라 주세요.";
  }

  const minutes = Number(values.daily_minutes);
  if (!values.daily_minutes) errors.daily_minutes = "하루에 낼 수 있는 시간을 분 단위로 적어 주세요.";
  else if (!Number.isInteger(minutes)) errors.daily_minutes = "시간은 숫자(분)로만 적어 주세요.";
  else if (minutes < LIMITS.minMinutes || minutes > LIMITS.maxMinutes)
    errors.daily_minutes = `하루 시간은 ${LIMITS.minMinutes}분에서 ${LIMITS.maxMinutes}분 사이로 적어 주세요.`;

  if (values.note.length > LIMITS.note) errors.note = `${LIMITS.note}자 이하로 적어 주세요.`;
  return errors;
}

export function toValues(goal: Goal): GoalValues {
  return {
    title: goal.title,
    kind: goal.kind,
    deadline: goal.deadline ?? "",
    daily_minutes: String(goal.daily_minutes),
    note: goal.note ?? "",
    lock_targets: goal.lock_targets,
  };
}

// 버거운 날 계획을 조정하면 생기는 대가. 사업 규칙이라 AI가 아니라 코드가 정한다.
export function adjustmentRule(kind: GoalKind) {
  if (kind === "dated") return "날짜가 정해져 있어요. 조정해서 못 한 분량은 남은 날에 나뉘어 더해져요.";
  if (kind === "finish") return "기한이 없는 목표예요. 조정하면 그만큼 완료 예정일이 뒤로 밀려요.";
  return "계속 이어 가는 목표예요. 조정하면 그 주 분량이 줄고, 기록에 조정한 주로 남아요.";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" }).format(new Date());
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

export const totalMinutes = (tasks: PlanTask[]) => tasks.reduce((sum, task) => sum + task.minutes, 0);
