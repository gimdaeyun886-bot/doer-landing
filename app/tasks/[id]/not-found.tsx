import { ButtonLink, EmptyState } from "@/components/ui";

export default function TaskNotFound() {
  return (
    <EmptyState title="할 일을 찾을 수 없어요" action={<ButtonLink href="/tasks">할 일 목록으로</ButtonLink>}>
      이미 삭제됐거나 주소가 잘못됐어요.
    </EmptyState>
  );
}
