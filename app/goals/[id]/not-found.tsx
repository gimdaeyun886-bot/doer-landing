import { ButtonLink, EmptyState } from "@/components/ui";

export default function GoalNotFound() {
  return (
    <EmptyState icon="search" title="목표를 찾을 수 없어요" action={<ButtonLink href="/goals">내 목표로</ButtonLink>}>
      이미 삭제됐거나 주소가 잘못됐어요.
    </EmptyState>
  );
}
