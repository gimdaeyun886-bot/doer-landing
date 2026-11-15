import type { Metadata } from "next";
import { NavButton } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "개인정보 처리방침" };

const contact = SITE.contactEmail || "문의처 준비 중 (정식 모집 전에 안내해요)";

export default function PrivacyPage() {
  return (
    <article className="screen screen-calm doc">
      <div className="topbar">
        <NavButton href="/settings" icon="chevL" label="돌아가기" />
      </div>
      <header className="headline">
        <p className="overline">시행일 {SITE.effectiveDate}</p>
        <h1>개인정보 처리방침</h1>
        <p>Do-er는 시험 운영 중인 서비스예요. 계획을 짜고 인증을 확인하는 데 필요한 것만 받고, 아래에 적힌 것 말고는 쓰지 않아요.</p>
      </header>

      <section>
        <h2>1. 받는 정보와 쓰는 곳</h2>
        <table>
          <thead>
            <tr>
              <th>정보</th>
              <th>쓰는 곳</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>이메일, 비밀번호</td>
              <td>가입과 로그인. 비밀번호는 암호화해 저장하고 운영자도 볼 수 없어요.</td>
            </tr>
            <tr>
              <td>목표, 기한, 가능한 시간, 지금 상황, 코치와 나눈 대화</td>
              <td>계획 만들기와 조정. 대화 내용은 답을 만드는 동안만 쓰고 따로 저장하지 않아요.</td>
            </tr>
            <tr>
              <td>목차·범위 사진</td>
              <td>코치가 읽어 계획에 반영해요.</td>
            </tr>
            <tr>
              <td>인증 사진, 퀴즈와 글로 쓴 답</td>
              <td>그 과제를 끝냈는지 확인해요.</td>
            </tr>
            <tr>
              <td>잠글 앱 목록, 계획을 조정한 사정</td>
              <td>잠금과 계획 조정, 조정 기록 표시.</td>
            </tr>
            <tr>
              <td>AI 사용 횟수와 사용량</td>
              <td>하루 사용 횟수 제한과 비용 확인.</td>
            </tr>
          </tbody>
        </table>
        <p>주민등록번호, 전화번호, 결제 정보는 받지 않아요. 건강 상태나 신분증처럼 민감한 내용은 목표나 사진에 넣지 말아 주세요.</p>
      </section>

      <section>
        <h2>2. 휴대폰 앱의 접근성 권한</h2>
        <p>
          안드로이드 앱은 고른 앱을 잠그려고 접근성 권한을 써요. 이 권한으로는 지금 화면에 떠 있는 앱이 잠근 앱(또는 잠근 화면)인지만 확인해요. 화면에 적힌 내용, 입력한 글자, 다른 앱의 사용 기록은 모으거나 밖으로 보내지 않아요. 설치된 앱 목록은 잠글 앱을 고를 때 휴대폰 안에서만 쓰고 고른 앱의 이름만 저장해요. 권한은 휴대폰 설정에서 언제든 끌 수 있어요.
        </p>
      </section>

      <section>
        <h2>3. 보관 기간</h2>
        <ul>
          <li>인증 사진 원본: 판정한 날부터 7일 뒤 지워요. 판정에 이의를 제기할 수 있는 기간이에요.</li>
          <li>그 밖의 정보: 탈퇴할 때까지 보관하고, 탈퇴하면 올린 사진과 기록을 바로 지워요.</li>
          <li>지운 목표는 휴지통에 30일 동안 두었다가, 그 목표의 계획, 자료 사진, 인증 기록과 함께 지워요. 휴지통에서 바로 완전히 지울 수도 있어요.</li>
        </ul>
      </section>

      <section>
        <h2>4. 처리를 맡기는 곳</h2>
        <table>
          <thead>
            <tr>
              <th>맡는 곳</th>
              <th>맡기는 일</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>회원 정보와 목표·계획·인증 기록, 사진 저장</td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>서비스 화면과 서버 운영</td>
            </tr>
            <tr>
              <td>AI 모델 제공사(OpenAI)와 그 연결을 중계하는 사업자</td>
              <td>코치의 답, 계획, 인증 판정을 만들기 위해 대화 내용과 사진을 전달</td>
            </tr>
          </tbody>
        </table>
        <p>위 사업자의 서버는 해외에 있을 수 있어요. 광고나 판매 목적으로 다른 곳에 넘기지 않아요.</p>
      </section>

      <section>
        <h2>5. 내 정보에 대한 권리</h2>
        <ul>
          <li>목표와 잠글 앱은 앱 안에서 언제든 고치고 지울 수 있어요.</li>
          <li>&lsquo;내 정보 &gt; 탈퇴하기&rsquo;에서 계정과 모든 기록을 바로 지울 수 있어요.</li>
          <li>인증 판정이 틀렸다고 생각하면 그 과제의 인증 창에서 다시 봐 달라고 요청할 수 있어요. 운영자가 직접 확인해요.</li>
          <li>그 밖에 열람, 정정, 삭제를 원하면 아래 문의처로 알려 주세요.</li>
        </ul>
      </section>

      <section>
        <h2>6. 만 14세 미만</h2>
        <p>만 14세 미만은 가입할 수 없어요.</p>
      </section>

      <section>
        <h2>7. 운영자와 문의처</h2>
        <p>
          {SITE.operator}
          <br />
          문의: {contact}
        </p>
        <p>이 방침이 바뀌면 바뀌는 날 7일 전에 앱 안에서 알리고, 중요한 내용이면 다시 동의를 받아요.</p>
      </section>
    </article>
  );
}
