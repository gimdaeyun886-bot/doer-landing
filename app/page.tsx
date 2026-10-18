import TodayLayout from "./today/layout";
import TodayPage from "./today/page";

// 첫 주소는 넘겨주지 않고 오늘 화면을 바로 보여 준다. 링크 미리보기(노션 등)가 넘김 응답에서 멈추지 않게 하려는 것.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default function Home() {
  return (
    <TodayLayout>
      <TodayPage />
    </TodayLayout>
  );
}
