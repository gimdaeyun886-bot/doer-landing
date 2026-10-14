// 목표(mission_goals) 데이터의 형태와 입력 규칙. 서버와 브라우저가 함께 쓴다.
// 입력 규칙은 여기 한 곳에만 두고, 브라우저에서 먼저 보여 준 뒤 서버에서 반드시 다시 검사한다.

// 목표의 모양. Do-er는 시험에만 쓰는 앱이 아니어서 세 가지를 받는다.
export const KINDS = [
  { value: "dated", label: "정한 날까지", short: "날짜 있음", hint: "시험일이나 마감일처럼 끝나는 날이 있어요", example: "자격시험, 공모전 마감" },
  { value: "finish", label: "날짜 없이 완성", short: "날짜 없음", hint: "끝은 있지만 날짜는 정하지 않았어요", example: "책 한 권, 포트폴리오" },
  { value: "ongoing", label: "매주 반복", short: "매주 반복", hint: "끝나는 날 없이 이어 가는 습관이에요", example: "운동, 영어 회화" },
] as const;
export type GoalKind = (typeof KINDS)[number]["value"];
export const isKind = (value: unknown): value is GoalKind => KINDS.some((kind) => kind.value === value);
export const kindInfo = (kind: GoalKind) => KINDS.find((item) => item.value === kind)!;

// 실행하는 동안 잠글 앱. 전화·메신저·검색은 목록에 두지 않는다.
export const LOCK_APPS = ["인스타그램", "유튜브", "틱톡", "페이스북", "X", "네이버 웹툰", "넷플릭스"] as const;

// 요일은 0(일)부터 6(토)까지 숫자로 저장하고, 화면에는 월요일부터 보여 준다.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type Goal = {
  id: string;
  title: string;
  kind: GoalKind;
  deadline: string | null; // YYYY-MM-DD. kind가 dated일 때만 있다.
  weekdays: number[]; // 할 수 있는 요일
  daily_minutes: number;
  schedule: string | null; // 시간대 메모
  note: string | null;
  lock_apps: string[];
  material_path: string | null; // Storage 버킷 안의 파일 경로
  created_at: string;
  updated_at: string;
};

export const GOAL_COLUMNS = "id,title,kind,deadline,weekdays,daily_minutes,schedule,note,lock_apps,material_path,created_at,updated_at";

export type GoalValues = {
  title: string;
  kind: GoalKind;
  deadline: string;
  weekdays: number[];
  daily_minutes: string;
  schedule: string;
  note: string;
  lock_apps: string[];
};

export type GoalField = "title" | "deadline" | "weekdays" | "daily_minutes" | "schedule" | "note" | "lock_apps" | "material";
export type FieldErrors = Partial<Record<GoalField, string>>;

export type FormState = {
  attempt: number; // 제출할 때마다 늘려서, 서버가 돌려준 값으로 입력칸을 다시 그린다.
  message?: string;
  errors?: FieldErrors;
  values?: GoalValues;
};

export const EMPTY_VALUES: GoalValues = { title: "", kind: "dated", deadline: "", weekdays: [1, 2, 3, 4, 5], daily_minutes: "60", schedule: "", note: "", lock_apps: [] };

export const PAGE_SIZE = 5;
export const LIMITS = { title: 40, schedule: 120, note: 300, minMinutes: 10, maxMinutes: 600, maxDays: 730, search: 40 };

export const MATERIAL_BUCKET = "mission-materials";
export const MATERIAL_MAX_BYTES = 3 * 1024 * 1024;
export const MATERIAL_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const KIND_FILTERS = [{ value: "all", label: "전체" }, ...KINDS.map((kind) => ({ value: kind.value, label: kind.short }))] as const;
export type KindFilter = "all" | GoalKind;
export const SORTS = [
  { value: "recent", label: "최근 등록 순" },
  { value: "deadline", label: "목표일 가까운 순" },
] as const;
export type Sort = (typeof SORTS)[number]["value"];

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

// 날짜는 모두 서울 기준 YYYY-MM-DD 문자열로 다룬다.
const seoulDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
export const todayInSeoul = () => seoulDate.format(new Date());
export const dateInSeoul = (iso: string) => seoulDate.format(new Date(iso));
const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
export const addDays = (date: string, days: number) => new Date((dayNumber(date) + days) * 86_400_000).toISOString().slice(0, 10);
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
export const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);
export const daysLeft = (date: string) => daysBetween(todayInSeoul(), date);

// 고른 앱과 요일 가운데 허용된 것만, 정해진 순서로 남긴다.
export const cleanLockApps = (items: string[]) => LOCK_APPS.filter((app) => items.includes(app));
export const cleanWeekdays = (items: (string | number)[]) => [0, 1, 2, 3, 4, 5, 6].filter((day) => items.map(Number).includes(day));

export function readValues(formData: FormData): GoalValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const kind = text("kind");
  return {
    title: text("title"),
    kind: isKind(kind) ? kind : "dated",
    deadline: text("deadline"),
    weekdays: cleanWeekdays(formData.getAll("weekdays").map(String)),
    daily_minutes: text("daily_minutes"),
    schedule: text("schedule"),
    note: text("note"),
    lock_apps: cleanLockApps(formData.getAll("lock_apps").map(String)),
  };
}

export function validateValues(values: GoalValues) {
  const errors: FieldErrors = {};
  if (!values.title) errors.title = "무엇을 해내고 싶은지 적어 주세요.";
  else if (values.title.length > LIMITS.title) errors.title = `목표는 ${LIMITS.title}자 이하로 적어 주세요.`;

  if (values.kind === "dated") {
    if (!values.deadline) errors.deadline = "목표 날짜를 골라 주세요. 날짜가 없으면 다른 종류를 골라요.";
    else if (!isRealDate(values.deadline)) errors.deadline = "날짜 형식이 올바르지 않아요. 예: 2026-11-15";
    else if (daysLeft(values.deadline) < 0) errors.deadline = "오늘이거나 오늘 이후의 날짜여야 해요.";
    else if (daysLeft(values.deadline) > LIMITS.maxDays) errors.deadline = "2년 이내의 날짜로 골라 주세요.";
  }

  if (!values.weekdays.length) errors.weekdays = "할 수 있는 요일을 하루 이상 골라 주세요.";

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
    weekdays: values.weekdays,
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
    weekdays: cleanWeekdays(goal.weekdays ?? []),
    daily_minutes: String(goal.daily_minutes),
    schedule: goal.schedule ?? "",
    note: goal.note ?? "",
    lock_apps: cleanLockApps(goal.lock_apps ?? []),
  };
}

// ── 표시 ──

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}분`;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

export function formatHours(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.round(minutes / 6) / 10;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}시간`;
}

export function weekdaysText(days: number[]) {
  const set = cleanWeekdays(days);
  if (set.length === 7) return "매일";
  if (set.join() === "1,2,3,4,5") return "평일";
  if (set.join() === "0,6") return "주말";
  return WEEK_ORDER.filter((day) => set.includes(day))
    .map((day) => DAY_NAMES[day])
    .join("·");
}

export function formatDate(value: string, withYear = true) {
  return new Intl.DateTimeFormat("ko-KR", { ...(withYear ? { year: "numeric" } : {}), month: "long", day: "numeric", weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(value));
}

// 목록과 상세에서 목표 옆에 붙는 짧은 표시.
export function goalTag(goal: Pick<Goal, "kind" | "deadline">) {
  if (goal.kind === "ongoing") return "매주";
  if (goal.kind === "finish" || !goal.deadline) return "기한 없음";
  const left = daysLeft(goal.deadline);
  if (left < 0) return "지남";
  return left === 0 ? "D-DAY" : `D-${left}`;
}

export const kindTone = (kind: GoalKind) => (kind === "dated" ? "coral" : kind === "ongoing" ? "green" : "neutral");

// 두 날짜 사이(둘 다 포함)에 할 수 있는 날이 며칠인지.
export function countSessions(from: string, to: string, weekdays: number[]) {
  const total = daysBetween(from, to) + 1;
  if (total <= 0 || !weekdays.length) return 0;
  const full = Math.floor(total / 7) * weekdays.length;
  let rest = 0;
  const start = weekdayOf(from);
  for (let i = 0; i < total % 7; i++) if (weekdays.includes((start + i) % 7)) rest++;
  return full + rest;
}

// 하루 시간과 요일로 어림한 앞으로의 분량. 계획을 짜기 전에 감을 잡는 용도다.
export function outlook(goal: Pick<Goal, "kind" | "deadline" | "weekdays" | "daily_minutes">) {
  const perWeek = goal.weekdays.length;
  if (goal.kind === "dated" && goal.deadline) {
    const left = daysLeft(goal.deadline);
    if (left < 0) return { sessions: 0, minutes: 0, label: "목표일이 지났어요", detail: "목표 고치기에서 날짜를 다시 정해 주세요." };
    const sessions = countSessions(todayInSeoul(), goal.deadline, goal.weekdays);
    return { sessions, minutes: sessions * goal.daily_minutes, label: `${sessions}번, 약 ${formatHours(sessions * goal.daily_minutes)}`, detail: `오늘부터 목표일까지 ${weekdaysText(goal.weekdays)}에 하루 ${formatMinutes(goal.daily_minutes)}씩` };
  }
  return { sessions: perWeek, minutes: perWeek * goal.daily_minutes, label: `한 주에 ${perWeek}번, 약 ${formatHours(perWeek * goal.daily_minutes)}`, detail: `${weekdaysText(goal.weekdays)} 하루 ${formatMinutes(goal.daily_minutes)}씩` };
}

// 날짜 있는 목표에서, 만든 날부터 목표일까지 얼마나 지났는지.
export function progress(goal: Pick<Goal, "kind" | "deadline" | "created_at">) {
  if (goal.kind !== "dated" || !goal.deadline) return null;
  const start = dateInSeoul(goal.created_at);
  const total = Math.max(1, daysBetween(start, goal.deadline));
  const passed = Math.min(total, Math.max(0, daysBetween(start, todayInSeoul())));
  return { passed, left: Math.max(0, daysLeft(goal.deadline)), ratio: passed / total };
}
