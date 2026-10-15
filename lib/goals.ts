// 목표(goals) 데이터의 형태와 입력 규칙. 서버와 브라우저 양쪽에서 함께 쓴다.

// AI가 만든 할 일 하나. 사용자는 이 내용을 직접 고치지 않는다.
export type PlanTask = {
  id: string; // 날짜-순번. 인증 기록이 이 값으로 붙는다.
  title: string;
  detail: string;
  minutes: number; // 참고용 예상 시간
  verify_type: VerifyType; // 이 과제에 맞춰 코치가 고른 인증 방식
  verify_method: string; // 그 방식의 이름. 예: 채점한 풀이 사진, 핵심 개념 퀴즈
  verify_guide: string;
};

// 맞춤 인증. 과제의 성격에 따라 코치가 고른다.
export const VERIFY_TYPES = {
  photo: { label: "사진 인증", icon: "camera", how: "결과물을 찍어 올리면 코치가 사진을 보고 확인해요." },
  quiz: { label: "퀴즈 인증", icon: "quiz", how: "코치가 오늘 한 내용에서 세 문제를 내요. 두 문제 이상 맞히면 통과예요." },
  write: { label: "글 인증", icon: "pen", how: "오늘 한 것을 자기 말로 적으면 코치가 읽고 확인해요." },
} as const;
export type VerifyType = keyof typeof VERIFY_TYPES;
export const isVerifyType = (value: unknown): value is VerifyType => typeof value === "string" && value in VERIFY_TYPES;
export const verifyTypeOf = (task: { verify_type?: string }): VerifyType => (isVerifyType(task.verify_type) ? task.verify_type : "photo");

export type PlanDay = { date: string; tasks: PlanTask[] };

export type PlanWeek = { week: number; start: string; end: string; focus: string; why: string; items: string[] };

// 전체 기간의 계획. weeks는 큰 흐름, days는 날짜마다 할 일.
export type Plan = {
  summary: string;
  basis: string[]; // 이렇게 짠 근거
  assumptions: string[]; // 코치가 가정한 것
  weeks: PlanWeek[];
  days: PlanDay[];
};

export type Proof = { goal_id: string; task_id: string; date: string; kind: VerifyType; passed: boolean; reason: string; image_path: string | null; appeal: string | null; created_at: string };

// 버거운 날 코치가 내놓는 조정안 하나. 무엇이 달라지고 어떤 대가가 따르는지 함께 보여 준다.
export type AdjustOption = {
  label: string;
  impact: string;
  moves: { goal_id: string; task_id: string; to_date: string }[]; // 다른 날로 옮길 과제
  drops: { goal_id: string; task_id: string }[]; // 이번에는 하지 않을 과제
};

export type PlanStatus = "pending" | "ready" | "failed";

// 목표의 모양. 조정했을 때의 대가가 이 값에 따라 달라진다.
export const KINDS = [
  { value: "dated", label: "정한 날까지", short: "날짜 있음", hint: "시험일이나 마감일처럼 끝나는 날이 정해진 목표예요. 그날에 맞춰 거꾸로 계산해 짜요." },
  { value: "finish", label: "날짜 없이 완성", short: "날짜 없음", hint: "책 한 권, 포트폴리오처럼 끝은 있지만 날짜는 정하지 않은 목표예요. 코치가 끝나는 때를 어림해 짜요." },
  { value: "ongoing", label: "매주 반복", short: "매주 반복", hint: "운동이나 회화처럼 끝나는 날 없이 이어 가는 습관이에요. 4주씩 짜고 조금씩 늘려요." },
] as const;
export type GoalKind = (typeof KINDS)[number]["value"];
export const isKind = (value: unknown): value is GoalKind => KINDS.some((kind) => kind.value === value);

export type Goal = {
  id: string;
  title: string;
  kind: GoalKind;
  deadline: string | null; // YYYY-MM-DD. kind가 dated일 때만 있다.
  daily_minutes: number;
  schedule: string | null; // 언제 할 수 있는지 (요일, 시간대)
  note: string | null;
  context: string | null; // 대화에서 코치가 더 알게 된 것. 한 줄에 하나씩
  material_path: string | null; // Storage 버킷 안의 파일 경로
  material_summary: string | null; // 코치가 사진에서 읽은 내용
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
  schedule: string;
  note: string;
  context: string;
  material_summary: string;
  lock_targets: string[]; // 잠글 앱은 목표가 아니라 사용자 한 명에게 한 벌이다.
};

export type GoalField = "title" | "deadline" | "daily_minutes" | "schedule" | "note" | "context" | "lock_targets" | "material";

export type FormState = {
  attempt: number;
  message?: string;
  errors?: Partial<Record<GoalField, string>>;
  values?: GoalValues;
};

export const EMPTY_VALUES: GoalValues = { title: "", kind: "dated", deadline: "", daily_minutes: "", schedule: "", note: "", context: "", material_summary: "", lock_targets: [] };

export const PAGE_SIZE = 5;
export const MATERIAL_BUCKET = "mission-materials";
export const MATERIAL_MAX_BYTES = 3 * 1024 * 1024;
export const MATERIAL_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const LIMITS = { title: 40, note: 300, context: 1500, facts: 14, schedule: 120, summary: 1500, minMinutes: 10, maxMinutes: 600, lockCount: 12, lockLength: 80, proofText: 1000, appeal: 300, reason: 200 };
// 잠글 수 있는 앱. parts가 있으면 앱 전체 대신 그 화면만 골라 잠글 수 있다.
// 휴대폰 앱에서는 설치된 앱 목록에서 직접 고르고, 웹에서는 자주 쓰는 앱 가운데 고른다.
export const LOCK_APPS: { name: string; pkg: string; parts?: string[] }[] = [
  { name: "인스타그램", pkg: "com.instagram.android", parts: ["릴스", "스토리", "탐색"] },
  { name: "유튜브", pkg: "com.google.android.youtube", parts: ["쇼츠"] },
  { name: "틱톡", pkg: "com.ss.android.ugc.trill" },
  { name: "페이스북", pkg: "com.facebook.katana", parts: ["릴스"] },
  { name: "X", pkg: "com.twitter.android" },
  { name: "네이버 웹툰", pkg: "com.nhn.android.webtoon" },
  { name: "넷플릭스", pkg: "com.netflix.mediaclient" },
];

// 잠글 대상 한 줄의 모양: "앱 이름", "앱 이름 화면", 또는 설치된 앱에서 고른 "앱 이름|패키지".
export const lockLabel = (target: string) => target.split("|")[0];
export const lockLabels = (targets: string[]) => targets.map(lockLabel);

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
  if (goal.kind === "ongoing") return "매주 반복";
  if (goal.kind === "finish" || !goal.deadline) return "날짜 없음";
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
  return {
    title: text("title"),
    kind: isKind(kind) ? kind : "dated",
    deadline: text("deadline"),
    daily_minutes: text("daily_minutes"),
    schedule: text("schedule"),
    note: text("note"),
    context: text("context"),
    material_summary: text("material_summary").slice(0, LIMITS.summary),
    lock_targets: cleanLockTargets(picked),
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

  if (values.schedule.length > LIMITS.schedule) errors.schedule = `${LIMITS.schedule}자 이하로 적어 주세요.`;
  if (values.note.length > LIMITS.note) errors.note = `${LIMITS.note}자 이하로 적어 주세요.`;
  if (values.context.length > LIMITS.context) errors.context = `${LIMITS.context}자 이하로 적어 주세요.`;
  return errors;
}

export function toValues(goal: Goal, lockTargets: string[]): GoalValues {
  return {
    title: goal.title,
    kind: goal.kind,
    deadline: goal.deadline ?? "",
    daily_minutes: String(goal.daily_minutes),
    schedule: goal.schedule ?? "",
    note: goal.note ?? "",
    context: goal.context ?? "",
    material_summary: goal.material_summary ?? "",
    lock_targets: lockTargets,
  };
}

// 버거운 날 계획을 조정하면 생기는 대가. 사업 규칙이라 AI가 아니라 코드가 정한다.
export function adjustmentRule(kind: GoalKind) {
  if (kind === "dated") return "날짜가 정해져 있어요. 조정해서 못 한 분량은 남은 날에 나눠 더해요.";
  if (kind === "finish") return "날짜를 정하지 않은 목표예요. 조정하면 그만큼 끝나는 날이 뒤로 밀려요.";
  return "매주 반복하는 목표예요. 조정하면 그 주 분량이 줄고 기록에 조정한 주로 남아요.";
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

export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

export function formatDay(date: string) {
  return `${formatDate(date)} ${weekdayOf(date)}요일`;
}

// 그 날짜에 할 일. 계획이 없거나 쉬는 날이면 빈 배열.
export function tasksOn(goal: Pick<Goal, "plan" | "plan_status">, date: string): PlanTask[] {
  if (goal.plan_status !== "ready" || !goal.plan) return [];
  return goal.plan.days?.find((day) => day.date === date)?.tasks ?? [];
}

export const planEnd = (plan: Plan) => plan.weeks[plan.weeks.length - 1]?.end ?? null;
