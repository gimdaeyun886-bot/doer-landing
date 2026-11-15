import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 인증 이미지(최대 3MB)를 Server Action으로 받는다. Vercel 함수 본문 한도(4.5MB) 안쪽.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async redirects() {
    // 첫 주소에서 바로 앱을 연다(로그인 전이면 proxy가 /login으로 보낸다).
    // 랜딩(public/index.html)은 이 배포에서 열리지 않게 /index.html도 앱으로 보낸다.
    return [
      { source: "/", destination: "/today", permanent: false },
      { source: "/index.html", destination: "/today", permanent: false },
    ];
  },
};

export default nextConfig;
