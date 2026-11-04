import type { Metadata } from "next";
import { signOut } from "@/app/auth/actions";
import { AccessStatus, DeleteAccount } from "@/components/SettingsForms";
import { RowLink, Section, TabBar } from "@/components/ui";
import { lockAppCount } from "@/lib/goals";
import { getSettings, getUser } from "@/lib/supabase";

export const metadata: Metadata = { title: "내 정보" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);
  const count = lockAppCount(settings.lockTargets);
  return (
    <div className="screen screen-warm settings">
      <header className="headline">
        <p className="date">{user?.email || (user?.app_metadata?.provider === "kakao" ? "카카오 계정으로 로그인" : "로그인 중")}</p>
        <h1>내 정보</h1>
      </header>

      <Section className="rows">
        <RowLink href="/settings/locks" icon="lock" title="잠글 앱" value={count ? `${count}개 앱` : "없음"} />
      </Section>
      <AccessStatus />

      <Section className="rows">
        <RowLink href="/privacy" title="개인정보 처리방침" />
        <RowLink href="/terms" title="이용약관" />
      </Section>

      <Section className="rows">
        <form action={signOut}>
          <button type="submit" className="row">
            <span className="row-text">
              <b>로그아웃</b>
            </span>
          </button>
        </form>
        <DeleteAccount />
      </Section>
      <TabBar active="me" />
    </div>
  );
}
