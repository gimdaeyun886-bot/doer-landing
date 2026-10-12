// 디자인 미리보기(/goals/preview)용 예시 목표. 실제 데이터는 Supabase에만 저장한다.
import type { Goal } from "./goals";

const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const stamp = "2026-10-12T12:30:00+09:00";

export const SAMPLE_GOALS: Goal[] = [
  {
    id: "sample-dated",
    title: "정보처리기사 실기",
    exam_date: addDays(34),
    daily_minutes: 60,
    note: "필기는 합격했고 SQL이 약해요. 수제비 교재로 공부해요.",
    material_path: null,
    plan_status: "ready",
    plan_generated_at: stamp,
    created_at: stamp,
    updated_at: stamp,
    plan: {
      summary: "남은 5주 중 앞의 3주는 약한 SQL과 프로그래밍 언어를 먼저 잡고, 마지막 2주는 기출 풀이와 오답 복습에 써요.",
      today: [
        {
          title: "SQL 기본 문법 개념 정리",
          minutes: 20,
          detail: "SELECT, JOIN, GROUP BY를 교재 예제와 함께 한 쪽으로 정리해요.",
          verify_method: "정리 노트 사진",
          verify_guide: "세 가지 문법의 예시가 손글씨나 타이핑으로 적힌 노트가 보여야 해요.",
        },
        {
          title: "SQL 기출 10문제 풀기",
          minutes: 25,
          detail: "최근 회차의 SQL 문제 10개를 시간 재고 풀어요.",
          verify_method: "채점한 풀이 사진",
          verify_guide: "문제 번호와 동그라미·엑스 표시가 함께 보여야 해요.",
        },
        {
          title: "틀린 문제 오답 정리",
          minutes: 15,
          detail: "틀린 문제의 정답 쿼리와 틀린 이유를 한 줄씩 적어요.",
          verify_method: "오답 노트 사진",
          verify_guide: "틀린 문제마다 이유가 한 줄 이상 적혀 있어야 해요.",
        },
      ],
      weeks: [
        { week: 1, focus: "SQL 기본기", items: ["SELECT·JOIN·GROUP BY 개념 정리", "SQL 기출 유형별 30문제", "오답 노트 만들기"] },
        { week: 2, focus: "프로그래밍 언어", items: ["C 포인터와 배열 문제", "Java 상속·오버라이딩 문제", "Python 자료형 문제"] },
        { week: 3, focus: "이론 암기", items: ["소프트웨어 설계 용어", "네트워크·보안 용어", "빈칸 테스트로 암기 확인"] },
        { week: 4, focus: "기출 회독", items: ["최근 3개년 기출 시간 재고 풀기", "틀린 유형만 다시 풀기"] },
        { week: 5, focus: "마무리 복습", items: ["오답 노트 전체 복습", "실전처럼 모의 1회", "시험 전날 가볍게 훑기"] },
      ],
    },
  },
  {
    id: "sample-open",
    title: "토익 850",
    exam_date: null,
    daily_minutes: 45,
    note: null,
    material_path: null,
    plan_status: "ready",
    plan_generated_at: stamp,
    created_at: stamp,
    updated_at: stamp,
    plan: {
      summary: "기한이 없으니 매일 45분씩 LC와 RC를 번갈아 하고, 4주마다 모의고사로 점수를 확인해요.",
      today: [
        {
          title: "LC 파트 2 모의 25문제",
          minutes: 20,
          detail: "질의응답 25문제를 듣고 풀어요.",
          verify_method: "채점 결과 화면",
          verify_guide: "맞은 개수가 표시된 채점 화면이 보여야 해요.",
        },
        {
          title: "틀린 문제 받아쓰기",
          minutes: 25,
          detail: "틀린 문제의 질문과 정답 문장을 받아써요.",
          verify_method: "받아쓰기 노트 사진",
          verify_guide: "문제 번호와 받아쓴 문장이 함께 보여야 해요.",
        },
      ],
      weeks: [
        { week: 1, focus: "LC 파트 1·2", items: ["파트 2 유형별 풀이", "틀린 문제 받아쓰기"] },
        { week: 2, focus: "RC 파트 5", items: ["문법 유형 정리", "하루 30문제 시간 재고 풀기"] },
        { week: 3, focus: "LC 파트 3·4", items: ["선지 미리 읽기 연습", "쉐도잉 10분"] },
        { week: 4, focus: "모의고사와 점검", items: ["실전 모의 1회", "약한 파트 다시 정하기"] },
      ],
    },
  },
  {
    id: "sample-failed",
    title: "SQLD",
    exam_date: addDays(9),
    daily_minutes: 90,
    note: null,
    material_path: null,
    plan: null,
    plan_status: "failed",
    plan_generated_at: null,
    created_at: stamp,
    updated_at: stamp,
  },
];
