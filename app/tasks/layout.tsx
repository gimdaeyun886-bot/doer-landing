import Link from "next/link";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header">
        <div className="shell app-header-inner">
          {/* 첫 화면은 정적 랜딩 파일이라 일반 링크로 이동한다. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages, @next/next/no-img-element */}
          <a href="/" className="app-wordmark" aria-label="Do-er 소개 페이지로"><img src="/assets/original-wordmark.png" width={144} height={42} alt="do-er" /></a>
          <nav aria-label="주 메뉴">
            <Link href="/tasks">오늘 할 일</Link>
            <Link href="/tasks/new" className="btn btn-primary btn-small">
              할 일 등록
            </Link>
          </nav>
        </div>
      </header>
      <main className="shell">{children}</main>
      <footer className="app-footer shell">
        <span>계획을, 오늘의 실행으로.</span>
        <small>로그인 없이 누구나 볼 수 있는 연습용 기록이에요. 개인정보는 적지 마세요.</small>
      </footer>
    </>
  );
}
