import type { Metadata } from "next";
import { LockSettings } from "@/components/SettingsForms";
import { getSettings, lockedNow } from "@/lib/supabase";

export const metadata: Metadata = { title: "잠글 앱" };
export const dynamic = "force-dynamic";

// 내 정보의 하위 화면이라 목표 상세처럼 탭 바를 두지 않는다.
export default async function LockSettingsPage() {
  const [settings, locked] = await Promise.all([getSettings(), lockedNow()]);
  return (
    <div className="screen screen-warm settings">
      <LockSettings initial={settings.lockTargets} locked={locked} />
    </div>
  );
}
