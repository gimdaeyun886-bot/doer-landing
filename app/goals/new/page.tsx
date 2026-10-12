import type { Metadata } from "next";
import { CoachChat } from "@/components/CoachChat";
import { todayInSeoul } from "@/lib/goals";
import { getSettings, isConfigured } from "@/lib/supabase";

export const metadata: Metadata = { title: "코치와 목표 정하기" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function NewGoalPage() {
  return <CoachChat today={todayInSeoul()} savedLocks={isConfigured() ? (await getSettings()).lockTargets : []} />;
}
