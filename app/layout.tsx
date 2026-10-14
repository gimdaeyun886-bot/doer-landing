import type { Metadata, Viewport } from "next";
import { Gothic_A1 } from "next/font/google";
import "./globals.css";

const gothic = Gothic_A1({ weight: ["400", "500", "600", "700", "800"], subsets: ["latin"], display: "swap", variable: "--font-gothic" });

export const metadata: Metadata = {
  title: { default: "Do-er — 계획을, 오늘의 실행으로", template: "%s | Do-er" },
  description: "해내고 싶은 목표와 하루에 낼 시간, 잠글 앱을 적어 두는 Do-er의 목표 관리.",
  icons: { icon: "/assets/symbol-light.png" },
  openGraph: { title: "Do-er 목표 관리", description: "목표와 하루에 낼 시간, 실행할 때 잠글 앱을 적어 둬요.", images: ["/assets/study-character-v4.webp"] },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={gothic.variable}>
      <body>{children}</body>
    </html>
  );
}
