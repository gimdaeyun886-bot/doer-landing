// 목표(mission_goals) 데이터의 형태와 입력 규칙. 서버와 브라우저가 함께 쓴다.
// 입력 규칙은 여기 한 곳에만 두고, 브라우저에서 먼저 보여 준 뒤 서버에서 반드시 다시 검사한다.

// 목표의 모양. Do-er는 시험에만 쓰는 앱이 아니어서 세 가지를 받는다.
export const KINDS = [
  { value: "dated", label: "정한 날까지", short: "날짜 있음", hint: "시험일이나 마감일처럼 끝나는 날이 정해진 목표예요." },
  { value: "finish", label: "날짜 없이 완성", short: "날짜 없음", hint: "책 한 권, 포트폴리오처럼 끝은 있지만 날짜는 정하지 않은 목표예요." },
  { value: "ongoing", label: "매주 반복", short: "매주 반복", hint: "운동이나 회화처럼 끝나는 날 없이 이어 가는 습관이에요." },
] as const;
export type GoalKind = (typeof KINDS)[number]["value"];
export const isKind = (value: unknown): value is GoalKind => KINDS.some((kind) => kind.value === value);
export const kindLabel = (kind: GoalKind) => KINDS.find((item) => item.value === kind)!.short;

// 실행하는 동안 잠글 앱. 전화·메신저·검색은 목록에 두지 않는다.
export const LOCK_APPS = ["인스타그램", "유튜브", "틱톡", "페이스북", "X", "네이버 웹툰", "넷플릭스"] as const;

export type Goal = {
  id: string;
  title: string;
  kind: GoalKind;
  deadline: string | null; // YYYY-MM-DD. kind가 dated일 때만 있다.
  daily_minutes: number;
  schedule: string | null;
  note: string | null;
  lock_apps: string[];
  material_path: string | null; // Storage 버킷 안의 파일 경로
  created_at: string;
  updated_at: string;
};

export const GOAL_COLUMNS = "id,title,kind,deadline,daily_minutes,schedule,note,lock_apps,material_path,created_at,updated_at";

export type GoalValues = {
  title: string;
  kind: GoalKind;
  deadline: string;
  daily_minutes: string;
  schedule: string;
  note: string;
  lock_apps: string[];
};

export type GoalField = "title" | "deadline" | "daily_minutes" | "schedule" | "note" | "lock_apps" | "material";

export type FormState = {
  attempt: number; // 제출할 때마다 늘려서, 서버가 돌려준 값으로 입력칸을 다시 그린다.
  message?: string;
  errors?: Partial<Record<GoalField, string>>;
  values?: GoalValues;
};

export const EMPTY_VALUES: GoalValues = { title: "", kind: "dated", deadline: "", daily_minutes: "", schedule: "", note: "", lock_apps: [] };

export const PAGE_SIZE = 5;
export const LIMITS = { title: 40, schedule: 120, note: 300, minMinutes: 10, maxMinutes: 600, maxDays: 730, search: 40 };

export const MATERIAL_BUCKET = "mission-materials";
export const MATERIAL_MAX_BYTES = 3 * 1024 * 1024;
export const MATERIAL_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

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

// 고른 앱 가운데 목록에 있는 것만, 목록 순서대로 남긴다.
export const cleanLockApps = (items: string[]) => LOCK_APPS.filter((app) => items.includes(app));

export function readValues(formData: FormData): GoalValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const kind = text("kind");
  return {
    title: text("title"),
    kind: isKind(kind) ? kind : "dated",
    deadline: text("deadline"),
    daily_minutes: text("daily_minutes"),
    schedule: text("schedule"),
    note: text("note"),
    lock_apps: cleanLockApps(formData.getAll("lock_apps").map(String)),
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
    else if (daysLeft(values.deadline) > LIMITS.maxDays) errors.deadline = "2년 이내의 날짜로 골라 주세요.";
  }

  const minutes = Number(values.daily_minutes);
  if (!values.daily_minutes) errors.daily_minutes = "하루에 낼 수 있는 시간을 분 단위로 적어 주세요.";
  else if (!Number.isInteger(minutes)) errors.daily_minutes = "시간은 숫자(분)로만 적어 주세요.";
  else if (minutes < LIMITS.minMinutes || minutes > LIMITS.maxMinutes) errors.daily_minutes = `하루 시간은 ${LIMITS.minMinutes}분에서 ${LIMITS.maxMinutes}분 사이로 적어 주세요.`;

  if (values.schedule.length > LIMITS.schedule) errors.schedule = `${LIMITS.schedule}자 이하로 적어 주세요.`;
  if (values.note.length > LIMITS.note) errors.note = `${LIMITS.note}자 이하로 적어 주세요.`;
  return errors;
}

// 검사를 마친 값을 테이블의 한 줄로 바꾼다. 빈 글은 null로 둔다.
export function toRow(values: GoalValues) {
  return {
    title: values.title,
    kind: values.kind,
    deadline: values.kind === "dated" ? values.deadline : null,
    daily_minutes: Number(values.daily_minutes),
    schedule: values.schedule || null,
    note: values.note || null,
    lock_apps: values.lock_apps,
  };
}

export function toValues(goal: Goal): GoalValues {
  return {
    title: goal.title,
    kind: goal.kind,
    deadline: goal.deadline ?? "",
    daily_minutes: String(goal.daily_minutes),
    schedule: goal.schedule ?? "",
    note: goal.note ?? "",
    lock_apps: cleanLockApps(goal.lock_apps ?? []),
  };
}

// 목록과 상세에서 목표 옆에 붙는 짧은 표시.
export function goalTag(goal: Pick<Goal, "kind" | "deadline">) {
  if (goal.kind === "ongoing") return "매주 반복";
  if (goal.kind === "finish" || !goal.deadline) return "날짜 없음";
  const left = daysLeft(goal.deadline);
  if (left < 0) return "날짜 지남";
  return left === 0 ? "D-DAY" : `D-${left}`;
}

export const kindTone = (kind: GoalKind) => (kind === "dated" ? "coral" : kind === "ongoing" ? "green" : "neutral");

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}분`;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

const hoursText = (minutes: number) => {
  const hours = Math.round(minutes / 6) / 10;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}시간`;
};

// 하루 시간으로 어림한 쓸 수 있는 시간. 계획을 짜기 전에 감을 잡는 용도다.
export function timeBudget(goal: Pick<Goal, "kind" | "deadline" | "daily_minutes">) {
  if (goal.kind === "ongoing") return `한 주에 약 ${hoursText(goal.daily_minutes * 7)}`;
  if (goal.kind === "dated" && goal.deadline) {
    const days = daysLeft(goal.deadline);
    if (days < 0) return "목표일이 지났어요";
    return `남은 ${days + 1}일 동안 약 ${hoursText(goal.daily_minutes * (days + 1))}`;
  }
  return `하루 ${formatMinutes(goal.daily_minutes)}씩, 끝날 때까지`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}
