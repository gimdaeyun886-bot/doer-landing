import type { Metadata } from "next";
import { LockSettings } from "@/components/SettingsForms";
import { TabBar } from "@/components/ui";
import { getSettings } from "@/lib/supabase";

export const metadata: Metadata = { title: "잠글 앱" };
export const dynamic = "force-dynamic";

export default async function LockSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="screen screen-warm settings">
      <LockSettings initial={settings.lockTargets} />
      <TabBar active="me" />
    </div>
  );
}
