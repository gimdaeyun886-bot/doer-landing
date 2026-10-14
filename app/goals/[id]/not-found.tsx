import { ButtonLink, EmptyState } from "@/components/ui";

export default function GoalNotFound() {
  return (
    <main className="screen center">
      <EmptyState title="목표를 찾을 수 없어요" action={<ButtonLink href="/goals">내 목표로</ButtonLink>}>
        이미 지웠거나 주소가 잘못됐어요.
      </EmptyState>
    </main>
  );
}
