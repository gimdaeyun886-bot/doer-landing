import { notFound } from "next/navigation";
import { GoalDetail } from "@/components/GoalDetail";
import { SAMPLE_GOALS } from "@/lib/sample";
import { previewOnly } from "../actions";

export default async function PreviewDetailPage({ params }: { params: Promise<{ sample: string }> }) {
  const { sample } = await params;
  const goal = SAMPLE_GOALS.find((item) => item.id === sample);
  if (!goal) notFound();
  return <GoalDetail goal={goal} materialSrc={null} replan={previewOnly} remove={previewOnly} backHref="/goals/preview" editHref="/goals/new" />;
}
