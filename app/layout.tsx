import type { Metadata, Viewport } from "next";
import "./globals.css";

// 본문과 화면 글꼴: Pretendard(SIL OFL). 화면에 쓰인 글자 묶음만 나눠 받는 공식 배포본을 쓴다.
const PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export const metadata: Metadata = {
  title: { default: "Do-er — 계획을, 오늘의 실행으로", template: "%s | Do-er" },
  description: "해내고 싶은 걸 코치에게 말하면, 계획을 짜서 오늘 할 일로 나눠 줘요.",
  icons: { icon: "/assets/symbol-light.png" },
};

export const viewport: Viewport = { themeColor: "#FAF7F2", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href={PRETENDARD} crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
