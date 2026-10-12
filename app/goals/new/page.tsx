import type { Metadata } from "next";
import { GoalForm } from "@/components/GoalForm";
import { BackLink, PageHeader } from "@/components/ui";
import { todayInSeoul } from "@/lib/goals";
import { createGoal } from "../actions";

export const metadata: Metadata = { title: "새 목표" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default function NewGoalPage() {
  return (
    <>
      <BackLink href="/goals">내 목표</BackLink>
      <PageHeader overline="새 목표" title={"어떤 시험을\n준비하나요?"} description="세 가지만 알려 주면 계획은 코치가 짜요. 할 일을 직접 적을 필요가 없어요." />
      <GoalForm action={createGoal} initial={{ title: "", exam_date: "", no_deadline: false, daily_minutes: "60", note: "" }} today={todayInSeoul()} submitLabel="계획 만들기" cancelHref="/goals" />
    </>
  );
}
