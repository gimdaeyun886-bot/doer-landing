import type { Metadata, Viewport } from "next";
import { Gothic_A1 } from "next/font/google";
import "./globals.css";

const gothic = Gothic_A1({ weight: ["400", "500", "600", "700", "800"], subsets: ["latin"], display: "swap", variable: "--font-gothic" });

export const metadata: Metadata = {
  title: { default: "Do-er — 계획을, 오늘의 실행으로", template: "%s | Do-er" },
  description: "해내고 싶은 걸 코치에게 말하면, 계획을 짜서 오늘 할 일로 나눠 줘요.",
  icons: { icon: "/assets/symbol-light.png" },
};

export const viewport: Viewport = { themeColor: "#FBF7F0", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={gothic.variable}>
      <body>{children}</body>
    </html>
  );
}
