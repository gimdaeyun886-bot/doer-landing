import type { Metadata } from "next";
import { TodayView } from "@/components/TodayView";
import { Notice, TabBar } from "@/components/ui";
import { todayInSeoul } from "@/lib/goals";
import { getSettings, isConfigured, listPlannedGoals, listProofs } from "@/lib/supabase";

export const metadata: Metadata = { title: "오늘 할 일" };
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function TodayPage() {
  if (!isConfigured()) {
    return (
      <div className="screen screen-warm today">
        <header className="headline">
          <h1>오늘 할 일</h1>
        </header>
        <Notice tone="error">저장소가 아직 연결되지 않았어요. README의 환경 변수 안내대로 Supabase 주소와 키를 설정해 주세요.</Notice>
        <TabBar active="today" />
      </div>
    );
  }
  const today = todayInSeoul();
  const [goals, proofs, settings] = await Promise.all([listPlannedGoals(), listProofs({ date: today }), getSettings()]);
  return <TodayView goals={goals} today={today} proofs={proofs} lockTargets={settings.lockTargets} started={settings.lockDate === today} />;
}
