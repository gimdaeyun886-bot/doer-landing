import Link from "next/link";

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <header className="app-header">
        {/* 첫 화면은 정적 랜딩 파일이라 일반 링크로 이동한다. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages, @next/next/no-img-element */}
        <a href="/" className="app-wordmark" aria-label="Do-er 소개 페이지로"><img src="/assets/original-wordmark.png" width={144} height={42} alt="do-er" /></a>
        <Link href="/goals" className="app-nav">
          내 목표
        </Link>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <span>계획을, 오늘의 실행으로.</span>
        <small>로그인 없이 누구나 볼 수 있는 시험판이에요. 개인정보는 적지 마세요.</small>
      </footer>
    </div>
  );
}
