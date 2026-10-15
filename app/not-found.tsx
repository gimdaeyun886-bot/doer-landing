import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="app">
      <div className="screen screen-calm center">
        <EmptyState title="페이지를 찾을 수 없어요" action={<ButtonLink href="/today">오늘로 가기</ButtonLink>}>
          주소가 바뀌었거나 없는 페이지예요.
        </EmptyState>
      </div>
    </div>
  );
}
