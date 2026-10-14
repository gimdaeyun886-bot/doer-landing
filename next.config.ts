import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 자료 사진(최대 3MB)을 Server Action으로 받는다. Vercel 함수 본문 한도(4.5MB) 안쪽.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async rewrites() {
    return {
      // 미션 5의 정적 랜딩(public/index.html)을 첫 화면으로 그대로 쓴다.
      beforeFiles: [{ source: "/", destination: "/index.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
