# 새 부품 명세

토큰은 `replica/design/tokens.json`. 참고 앱의 로고·아이콘·그림·문구는 쓰지 않고, Do-er 심볼과 직접 그린 선 아이콘만 쓴다.

```
StreakBadge (연속 기록)
  모양     오늘 화면 머리 오른쪽. 심볼 조각 + "N일째". 0일이면 "오늘이 첫날"
  상태     0일, 이어지는 중, 오늘 끝내면 이어짐(옅게), 이정표 날(3·7·14·30)
  토큰     bg surface, text text, 숫자 lg/700, radius pill
  동작     누르면 아래에 규칙 한 줄이 펼쳐짐: 할 일을 모두 인증한 날이 이어지고, 조정한 날도 이어지며, 쉬는 날은 세지 않음
  a11y     <button aria-expanded>, 숫자를 읽을 수 있게 "연속 4일"
  쓰는 곳  S01

Celebration (다 해낸 순간)
  모양     아래에서 올라오는 창. 심볼이 커졌다 자리 잡고, 둘레에 조각 여섯 개가 퍼졌다 사라짐. 연속 일수가 하나씩 올라감
  상태     첫날, 평범한 날, 이정표 날(문구와 움직임이 조금 더 큼), 내일이 쉬는 날
  토큰     radius sheet, motion celebrate, 숫자 display/800, 조각 accent·success·text
  동작     그날 처음 모두 끝냈을 때 한 번만. "확인"과 바깥 누르기로 닫힘. 움직임 줄이기 설정이면 움직임 없이 바로 보임
  a11y     <dialog aria-labelledby>, 열릴 때 확인 버튼에 초점
  쓰는 곳  S02

WeekBars (한 주 막대)
  모양     7칸. 칸마다 요일과 상태 점
  상태     끝냄(success), 조정함(accent 테두리), 못 함(danger 옅게), 쉬는 날(border), 아직(빈 테두리)
  토큰     칸 32x32, radius md
  a11y     칸마다 "10월 26일 월요일, 끝냄"
  쓰는 곳  S03, S02(이번 주 미리 보기)

StatTiles (숫자 타일)
  모양     2열. 큰 숫자와 짧은 이름
  상태     값 있음, 0
  토큰     bg surface, 숫자 xl/700, 이름 sm text-muted
  쓰는 곳  S03

LockInfo (잠금 화면 정보 줄, 안드로이드)
  모양     잠금 화면 제목 아래 한 줄: "남은 할 일 2가지 · 오늘 3번째로 열었어요"
  상태     첫 번째, 여러 번째, 남은 수 모름(웹이 아직 알려 주지 않음)
  토큰     on-night-muted, 15sp
  쓰는 곳  S04
```
