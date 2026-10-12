// 안드로이드 앱(웹 화면을 감싼 껍데기)이 열어 주는 기능. 브라우저에서는 없다.
export type InstalledApp = { label: string; pkg: string };

type Bridge = {
  getApps: () => string; // 설치된 앱 목록(JSON). 기기 밖으로 보내지 않고 고르는 데만 쓴다.
  hasAccess: () => boolean; // 잠금에 필요한 접근성 권한이 켜져 있는지
  openAccessSettings: () => void;
  setLock: (active: boolean, targetsJson: string) => void;
  openAppSettings?: () => void; // 이 앱의 정보 화면('제한된 설정 허용'이 있는 곳)
  getSeenIds?: () => string; // 잠근 앱 화면에서 본 요소 이름표(글 내용 아님). 가림막 조정용
  openExternal?: (url: string) => void; // 구글·카카오 로그인 화면을 바깥 브라우저로 연다
};

export function native(): Bridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { DoerNative?: Bridge }).DoerNative ?? null;
}

export function installedApps(): InstalledApp[] {
  try {
    const list = JSON.parse(native()?.getApps() ?? "[]") as InstalledApp[];
    return list.filter((app) => app?.label && app?.pkg).sort((a, b) => a.label.localeCompare(b.label, "ko"));
  } catch {
    return [];
  }
}
