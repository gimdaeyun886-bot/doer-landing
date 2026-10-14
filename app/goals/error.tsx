"use client";

import { useEffect } from "react";
import { Button, ButtonLink, EmptyState } from "@/components/ui";

// 저장소에 연결하지 못했을 때. 원인은 서버 로그에만 남기고, 화면에는 다시 시도할 길을 둔다.
export default function GoalsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="screen center">
      <EmptyState
        title="불러오지 못했어요"
        action={
          <div className="stack">
            <Button onClick={reset}>다시 시도</Button>
            <ButtonLink href="/goals" variant="ghost">
              목록으로 돌아가기
            </ButtonLink>
          </div>
        }
      >
        저장소에 연결하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.
      </EmptyState>
    </main>
  );
}
