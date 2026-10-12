import type { Metadata } from "next";
import { CoachChat } from "@/components/CoachChat";
import { todayInSeoul } from "@/lib/goals";

export const metadata: Metadata = { title: "코치와 목표 정하기" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default function NewGoalPage() {
  return <CoachChat today={todayInSeoul()} />;
}
