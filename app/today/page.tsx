import type { Metadata } from "next";
import { TodayView } from "@/components/TodayView";
import { Notice, TabBar } from "@/components/ui";
import { isConfigured, listPlannedGoals } from "@/lib/supabase";

export const metadata: Metadata = { title: "오늘 할 일" };
export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
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
  return <TodayView goals={await listPlannedGoals()} notice={notice} />;
}
