import type { Metadata } from "next";
import { AccessStatus, LockSettings } from "@/components/SettingsForms";
import { Section, TabBar } from "@/components/ui";
import { getSettings } from "@/lib/supabase";

export const metadata: Metadata = { title: "내 정보" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="screen screen-warm settings">
      <header className="headline">
        <p className="date">공용 데모</p>
        <h1>내 정보</h1>
      </header>

      <LockSettings initial={settings.lockTargets} />
      <AccessStatus />

      <Section title="이 데모에 대해">
        <ul className="bullets">
          <li>로그인 없이 모든 방문자가 같은 공간을 함께 써요. 이름, 연락처 같은 개인정보는 적지 마세요.</li>
          <li>적은 내용과 사진은 계획을 짜고 인증을 확인하려고 AI에게 보내요.</li>
          <li>앱 잠금은 Do-er 안드로이드 앱에서 걸려요. 웹에서는 준비 중이에요.</li>
          <li>로그인과 내 데이터만 보기는 다음 단계에서 붙여요.</li>
        </ul>
      </Section>
      <TabBar active="me" />
    </div>
  );
}
