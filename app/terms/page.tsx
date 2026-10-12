import type { Metadata } from "next";
import { NavButton } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "이용약관" };

export default function TermsPage() {
  return (
    <article className="screen screen-calm doc">
      <div className="topbar">
        <NavButton href="/settings" icon="chevL" label="돌아가기" />
      </div>
      <header className="headline">
        <p className="overline">시행일 {SITE.effectiveDate}</p>
        <h1>이용약관</h1>
        <p>Do-er를 쓰기 전에 알아 둘 약속이에요.</p>
      </header>

      <section>
        <h2>1. 서비스가 하는 일</h2>
        <p>Do-er는 사용자가 말한 목표를 바탕으로 AI 코치가 날짜별 계획을 짜고, 그날 할 일을 인증할 때까지 사용자가 고른 앱을 잠그는 서비스예요. 지금은 시험 운영 중이라 무료이고, 기능이 바뀌거나 예고 없이 멈출 수 있어요.</p>
      </section>

      <section>
        <h2>2. AI가 만든 내용</h2>
        <ul>
          <li>계획과 인증 판정은 AI가 만들어요. 틀리거나 사용자에게 맞지 않을 수 있어요.</li>
          <li>계획은 참고용이에요. 합격이나 목표 달성을 보장하지 않아요.</li>
          <li>운동이나 건강과 관련된 목표는 자기 몸 상태에 맞게 조절하고, 필요하면 전문가와 상의해 주세요.</li>
          <li>판정이 틀렸다고 생각하면 다시 봐 달라고 요청할 수 있어요.</li>
        </ul>
      </section>

      <section>
        <h2>3. 잠금</h2>
        <ul>
          <li>잠금은 사용자가 고른 앱에만, 사용자가 &lsquo;시작&rsquo;을 누른 뒤에만 걸려요.</li>
          <li>전화, 문자, 긴급 전화는 잠그지 않아요.</li>
          <li>잠금에 쓰는 권한은 휴대폰 설정에서 언제든 끌 수 있어요. Do-er는 막지 않아요. 권한을 끄거나 앱을 지운 날은 인증하지 못한 날로 남아요.</li>
          <li>휴대폰 종류나 앱 버전에 따라 일부 화면(릴스, 쇼츠 등)만 잠그는 기능이 정확하지 않을 수 있어요.</li>
        </ul>
      </section>

      <section>
        <h2>4. 사용자가 지킬 것</h2>
        <ul>
          <li>다른 사람의 사진이나 개인정보를 올리지 않아요.</li>
          <li>서비스를 망가뜨리거나 AI 사용 제한을 피하려는 행동을 하지 않아요.</li>
          <li>만 14세 이상만 가입할 수 있어요.</li>
        </ul>
      </section>

      <section>
        <h2>5. 그만 쓰기</h2>
        <p>&lsquo;내 정보 &gt; 탈퇴하기&rsquo;에서 언제든 그만둘 수 있어요. 탈퇴하면 기록과 사진이 바로 지워져요.</p>
      </section>

      <section>
        <h2>6. 책임의 범위</h2>
        <p>시험 운영 중인 무료 서비스라, 서비스가 멈추거나 기록이 사라져 생긴 손해에 대해서는 운영자에게 고의나 큰 잘못이 있을 때만 책임을 져요.</p>
      </section>

      <section>
        <h2>7. 운영자</h2>
        <p>
          {SITE.operator}
          <br />
          문의: {SITE.contactEmail || "문의처 준비 중 (정식 모집 전에 안내해요)"}
        </p>
      </section>
    </article>
  );
}
