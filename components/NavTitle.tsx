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
    const observer = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), { rootMargin: "-44px 0px 0px 0px" });
    observer.observe(big);
    return () => observer.disconnect();
  }, []);
  if (!title) return null;
  return (
    <div className="nav-title" data-shown={shown || undefined} aria-hidden="true">
      {title}
    </div>
  );
}
