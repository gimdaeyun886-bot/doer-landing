import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { AccessStatus, DeleteAccount, LockSettings } from "@/components/SettingsForms";
import { Button, Icon, TabBar } from "@/components/ui";
import { getSettings, getUser } from "@/lib/supabase";

export const metadata: Metadata = { title: "내 정보" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, settings] = await Promise.all([getUser(), getSettings()]);
  return (
    <div className="screen screen-warm settings">
      <header className="headline">
        <p className="date">{user?.email}</p>
        <h1>내 정보</h1>
      </header>

      <LockSettings initial={settings.lockTargets} />
      <AccessStatus />

      <nav className="card link-list" aria-label="약관과 정책">
        <Link href="/privacy">
          개인정보 처리방침
          <Icon name="chevR" size={16} />
        </Link>
        <Link href="/terms">
          이용약관
          <Icon name="chevR" size={16} />
        </Link>
      </nav>

      <form action={signOut}>
        <Button type="submit" variant="soft">
          로그아웃
        </Button>
      </form>
      <DeleteAccount />
      <TabBar active="me" />
    </div>
  );
}
