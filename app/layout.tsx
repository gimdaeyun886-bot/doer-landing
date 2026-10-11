import type { Metadata, Viewport } from "next";
import { Gothic_A1 } from "next/font/google";
import "./globals.css";

const gothic = Gothic_A1({ weight: ["400", "600", "700", "800"], subsets: ["latin"], display: "swap", variable: "--font-gothic" });

export const metadata: Metadata = {
  title: { default: "Do-er — 오늘 할 일", template: "%s | Do-er" },
  description: "오늘 할 일을 등록하고, 끝낸 증거로 인증하는 Do-er 실행 기록.",
  icons: { icon: "/assets/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#F7F4EE" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={gothic.variable}>
      <body>{children}</body>
    </html>
  );
}
