import type { Metadata } from "next";
import { TodayView } from "@/components/TodayView";
import { SAMPLE_GOALS } from "@/lib/sample";

export const metadata: Metadata = { title: "오늘 미리보기" };
export const dynamic = "force-dynamic";

const previewHref = (id: string) => `/goals/preview/${id}`;

export default function PreviewTodayPage() {
  const goals = SAMPLE_GOALS.filter((goal) => goal.plan_status === "ready" && goal.id !== "sample-finish");
  return <TodayView goals={goals} goalHref={previewHref} />;
}
