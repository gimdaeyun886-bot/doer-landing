"use client";

import { useEffect, useState } from "react";
import { CHAT_KEY } from "./CoachChat";
import { RowLink } from "./ui";

// 새 목표 대화로 가는 줄. 이 기기에 하던 대화가 남아 있으면 이어 하기로 보여 준다.
export function NewGoalRow() {
  const [resume, setResume] = useState(false);
  useEffect(() => {
    try {
      setResume(Boolean(JSON.parse(localStorage.getItem(CHAT_KEY) ?? "null")?.items?.length));
    } catch {}
  }, []);
  return resume ? (
    <RowLink href="/goals/new" icon="chat" title="하던 목표 대화 이어 하기" sub="대화는 이 기기에 저장돼 있어요" />
  ) : (
    <RowLink href="/goals/new" icon="plus" title="새 목표 정하기" sub="말하면 날짜별 계획을 짜요" />
  );
}
