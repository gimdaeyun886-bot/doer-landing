"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Art, Button, type ArtName } from "./ui";

// 실행을 돕는 근거와 Do-er에서 그것이 어떻게 쓰이는지. 출처는 원 논문의 저자와 연도.
const SLIDES: { art: ArtName; title: string; text: string; source: string }[] = [
  {
    art: "steps",
    title: "큰 목표는 오늘 몫으로 나눠요",
    text: "가까운 작은 목표를 세운 아이들이 더 빨리 늘고 자신감도 커졌어요. 코치가 매일 한두 가지로 나눠 드려요.",
    source: "Bandura & Schunk, 1981",
  },
  {
    art: "lock",
    title: "유혹은 참기보다 치워요",
    text: "의지로 버티기보다 유혹이 닿지 않게 상황을 바꾸는 쪽이 잘 통할 때가 많아요. 시작하면 고른 앱이 잠기고, 다 인증하기 전에는 풀리지 않아요.",
    source: "Duckworth, Gendler & Gross, 2016",
  },
  {
    art: "check",
    title: "해낸 것은 확인하고 남겨요",
    text: "진행을 꾸준히 확인하고 기록하면 목표를 이룰 가능성이 올라가요. 할 일마다 사진·퀴즈·글로 인증해요.",
    source: "Harkin 외, 2016 · 138개 연구 종합",
  },
  {
    art: "sprout",
    title: "놓친 날은 탓하지 않고 이어 가요",
    text: "미룬 자신을 너그럽게 넘긴 학생이 다음 시험에서는 덜 미뤘어요. 다만 기록은 옮긴 일까지 모두 인증해야 이어져요.",
    source: "Wohl, Pychyl & Bennett, 2010",
  },
];

// 가입 직후의 전체 화면 안내. 근거 네 장을 넘기면 코치 대화로 가서 고민을 묻는다.
export function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;
  const toChat = () => router.push("/goals/new?start=1");

  return (
    <div className="screen onboard">
      <div className="onboard-top">
        <ol className="onboard-dots" aria-label={`${SLIDES.length}장 중 ${index + 1}번째`}>
          {SLIDES.map((item, at) => (
            <li key={item.art} data-on={at === index ? "" : undefined} />
          ))}
        </ol>
        <button type="button" className="text-btn" onClick={toChat}>
          건너뛰기
        </button>
      </div>
      <div className="onboard-body" key={index} aria-live="polite">
        <div className="onboard-art">
          <Art name={slide.art} size={240} priority />
        </div>
        <h1>{slide.title}</h1>
        <p className="onboard-text">{slide.text}</p>
        <p className="onboard-source">근거 · {slide.source}</p>
      </div>
      <div className="onboard-actions">
        <Button type="button" onClick={() => (last ? toChat() : setIndex(index + 1))}>
          {last ? "시작하기" : "다음"}
        </Button>
        {/* 첫 장에도 자리를 남겨 두어 장을 넘길 때 버튼이 움직이지 않게 한다. */}
        <button type="button" className="text-btn" onClick={() => setIndex(index - 1)} disabled={index === 0} style={index === 0 ? { visibility: "hidden" } : undefined}>
          이전
        </button>
      </div>
    </div>
  );
}
