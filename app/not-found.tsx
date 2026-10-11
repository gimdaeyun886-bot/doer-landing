import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="shell shell-narrow">
      <EmptyState title="페이지를 찾을 수 없어요" action={<ButtonLink href="/tasks">할 일 목록으로</ButtonLink>}>
        주소가 바뀌었거나 없는 페이지예요.
      </EmptyState>
    </main>
  );
}
