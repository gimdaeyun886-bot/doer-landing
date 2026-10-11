"use client";

import { useEffect } from "react";
import { Button, ButtonLink, EmptyState } from "@/components/ui";

export default function TasksError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      title="데이터를 불러오지 못했어요"
      action={
        <div className="empty-actions">
          <Button onClick={reset}>다시 시도</Button>
          <ButtonLink href="/tasks" variant="ghost">
            목록으로
          </ButtonLink>
        </div>
      }
    >
      저장소에 연결하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.
    </EmptyState>
  );
}
