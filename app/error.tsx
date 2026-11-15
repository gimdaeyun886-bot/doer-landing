"use client";

import GoalsError from "./goals/error";

// 화면별 오류 화면이 없는 곳(로그인, 동의, 처리방침 등)에서 Next 기본 영문 화면 대신 보여 준다.
export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="app">
      <GoalsError {...props} />
    </div>
  );
}
