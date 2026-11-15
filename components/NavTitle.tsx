"use client";

import { useEffect, useState } from "react";

// 큰 제목이 화면 위로 지나가면 맨 위에 작은 제목 줄을 띄운다. 아이폰의 접히는 제목과 같은 동작이다.
export function NavTitle() {
  const [title, setTitle] = useState("");
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const big = document.querySelector(".screen .headline h1");
    if (!big) return;
    setTitle(big.textContent ?? "");
    // PC에서는 휴대폰 틀(.app)이 스크롤을 맡으므로 그 틀을 기준으로 본다.
    const app = big.closest(".app");
    const root = app && getComputedStyle(app).overflowY === "auto" ? app : null;
    const observer = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), { root, rootMargin: "-44px 0px 0px 0px" });
    observer.observe(big);
    // 모두 인증해서 큰 제목이 바뀌면 작은 제목도 따라 바꾼다.
    const watcher = new MutationObserver(() => setTitle(big.textContent ?? ""));
    watcher.observe(big, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      watcher.disconnect();
    };
  }, []);
  if (!title) return null;
  return (
    <div className="nav-title" data-shown={shown || undefined} aria-hidden="true">
      {title}
    </div>
  );
}
