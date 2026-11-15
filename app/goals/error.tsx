"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink, EmptyState } from "@/components/ui";

export default function GoalsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // 인터넷이 끊긴 것과 저장소 문제를 나눠 알린다. 처음 그릴 때는 서버와 같게 두고, 그린 뒤에 확인한다.
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    console.error(error);
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
  }, [error]);

  return (
    <div className="screen screen-calm center">
      <EmptyState
        title="불러오지 못했어요"
        action={
          <div className="stack">
            <Button onClick={reset}>다시 시도</Button>
            <ButtonLink href="/today" variant="ghost">
              오늘로 돌아가기
            </ButtonLink>
          </div>
        }
      >
        {offline ? "인터넷 연결이 끊겼어요. 연결된 뒤 다시 시도해 주세요." : "저장소에 연결하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요."}
      </EmptyState>
    </div>
  );
}
