// 잠글 앱을 나타내는 작은 타일. 상표 로고 대신 앱 이름의 첫 글자를 쓴다.
const SHADES: Record<string, string> = {
  인스타그램: "#f3e8f5",
  유튜브: "#fdecec",
  틱톡: "#e9eef5",
  페이스북: "#e8effc",
  X: "#eceef1",
  "네이버 웹툰": "#e6f6ec",
  넷플릭스: "#f8e9e9",
};

export function AppTile({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <span className="app-tile" style={{ width: size, height: size, background: SHADES[name] ?? "var(--tint)", fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {name.replace("네이버 ", "").slice(0, 1)}
    </span>
  );
}
