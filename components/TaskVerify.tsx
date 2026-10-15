"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { appealProof, startQuiz, verifyTask, type VerifyState } from "@/app/goals/actions";
import { LIMITS, VERIFY_TYPES, formatMinutes, materialError, verifyTypeOf, type PlanTask } from "@/lib/goals";
import { Button, Icon, Notice } from "./ui";

type Props = { goalId: string; goalTitle: string; task: PlanTask; proof: { passed: boolean; reason: string; appealed: boolean } | null };

// 오늘 할 일 한 줄. 누르면 창이 올라와, 코치가 이 과제에 맞춰 고른 방식(사진·퀴즈·글)으로 인증한다.
export function TaskVerify({ goalId, goalTitle, task, proof }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const kind = verifyTypeOf(task);
  const type = VERIFY_TYPES[kind];
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(verifyTask.bind(null, goalId, task.id), { attempt: 0 });
  const [appeal, appealAction, appealing] = useActionState(appealProof.bind(null, goalId, task.id), {});
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [loadingQuiz, startLoading] = useTransition();
  const [text, setText] = useState("");
  const [appealOpen, setAppealOpen] = useState(false);

  const passed = state.passed ?? proof?.passed ?? false;
  const reason = state.reason ?? proof?.reason ?? null;
  const judged = state.passed !== undefined || Boolean(proof);
  const appealed = appeal.sent || (state.attempt === 0 && proof?.appealed);

  // 판정이 끝나면 넣었던 것을 비워, 다시 할 때 새로 시작하게 한다.
  useEffect(() => {
    if (state.attempt === 0) return;
    setPreview(null);
    setQuestions(null);
    setAppealOpen(false);
    if (input.current) input.current.value = "";
  }, [state.attempt]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const problem = file ? materialError(file) : null;
    if (problem) event.target.value = "";
    setFileError(problem);
    setPreview(file && !problem ? URL.createObjectURL(file) : null);
  }

  function loadQuiz() {
    setQuizError(null);
    startLoading(async () => {
      const result = await startQuiz(goalId, task.id);
      if (result.questions) setQuestions(result.questions);
      else setQuizError(result.message ?? "문제를 만들지 못했어요.");
    });
  }

  const close = () => dialog.current?.close();
  const later = (
    <Button type="button" variant="quiet" onClick={close}>
      닫기
    </Button>
  );

  return (
    <li>
      <button type="button" className="today-row" onClick={() => dialog.current?.showModal()} data-state={passed ? "passed" : judged ? "retry" : "todo"}>
        <span className="check" aria-hidden="true">
          {passed && <Icon name="check" size={15} weight={3} />}
        </span>
        <span className="today-text">
          <b>{task.title}</b>
          <small>
            {type.label} · 약 {formatMinutes(task.minutes)}
            {judged && !passed && <em> · 다시 인증</em>}
          </small>
        </span>
        <span className="sr-only">{passed ? "인증 끝" : "눌러서 인증하기"}</span>
        <Icon name="chevR" size={16} />
      </button>

      <dialog ref={dialog} className="sheet verify-sheet" aria-labelledby={`verify-${task.id}`}>
        <span className="sheet-grip" aria-hidden="true" />
        <p className="sheet-over">{goalTitle}</p>
        <h2 id={`verify-${task.id}`}>{task.title}</h2>
        <p>{task.detail}</p>
        <div className="verify">
          <Icon name={type.icon} size={16} />
          <span>
            <b>
              {type.label} · {task.verify_method}
            </b>
            {task.verify_guide}
          </span>
        </div>

        {judged && !pending && reason && <Notice tone={passed ? "success" : "error"}>{reason}</Notice>}
        {state.message && !pending && <Notice tone="error">{state.message}</Notice>}
        {(fileError || quizError) && <Notice tone="error">{fileError ?? quizError}</Notice>}

        {passed ? (
          <div className="sheet-actions">
            <Button type="button" variant="quiet" onClick={close}>
              확인
            </Button>
          </div>
        ) : (
          <form action={formAction} className="sheet-actions" aria-busy={pending}>
            {kind === "photo" && (
              <>
                <input ref={input} name="proof" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} aria-label="인증할 사진" />
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="proof-preview" src={preview} alt="인증할 사진 미리보기" />
                )}
                {pending ? (
                  <Waiting>사진을 확인하고 있어요</Waiting>
                ) : preview ? (
                  <>
                    <Button type="submit">이 사진으로 인증</Button>
                    <Button type="button" variant="quiet" onClick={() => input.current?.click()}>
                      다른 사진
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" onClick={() => input.current?.click()}>
                      <Icon name="camera" size={19} />
                      {judged ? "다시 올리기" : "사진 올리기"}
                    </Button>
                    {later}
                  </>
                )}
              </>
            )}

            {kind === "quiz" &&
              (pending ? (
                <Waiting>답을 확인하고 있어요</Waiting>
              ) : questions ? (
                <>
                  <ol className="quiz">
                    {questions.map((question, number) => (
                      <li key={question}>
                        <label htmlFor={`q-${task.id}-${number}`}>
                          <b>{number + 1}</b>
                          {question}
                        </label>
                        <input type="hidden" name="question" value={question} />
                        <textarea id={`q-${task.id}-${number}`} name="answer" rows={2} maxLength={400} placeholder="아는 만큼 적어 주세요" required />
                      </li>
                    ))}
                  </ol>
                  <Button type="submit">답 보내기</Button>
                </>
              ) : loadingQuiz ? (
                <Waiting>문제를 만들고 있어요</Waiting>
              ) : (
                <>
                  <Button type="button" onClick={loadQuiz}>
                    <Icon name="quiz" size={19} />
                    {judged ? "새 문제로 다시 풀기" : "문제 받기"}
                  </Button>
                  {later}
                </>
              ))}

            {kind === "write" &&
              (pending ? (
                <Waiting>글을 확인하고 있어요</Waiting>
              ) : (
                <>
                  <label className="sr-only" htmlFor={`w-${task.id}`}>
                    오늘 한 것을 적어 주세요
                  </label>
                  <textarea id={`w-${task.id}`} className="proof-text" name="text" rows={5} maxLength={LIMITS.proofText} value={text} onChange={(event) => setText(event.target.value)} placeholder="무엇을 했고 무엇을 알게 됐는지 적어 주세요" />
                  <p className="count">{text.trim().length} / 40자 이상</p>
                  <Button type="submit" disabled={text.trim().length < 40}>
                    이 글로 인증
                  </Button>
                  {later}
                </>
              ))}
          </form>
        )}

        {judged && !passed && !pending && (
          <div className="appeal">
            {appealed ? (
              <p className="muted">다시 봐 달라고 요청했어요. 운영자가 확인해요.</p>
            ) : appealOpen ? (
              <form action={appealAction}>
                <label htmlFor={`a-${task.id}`}>어떤 점이 틀렸나요?</label>
                <textarea id={`a-${task.id}`} name="appeal" rows={2} maxLength={LIMITS.appeal} placeholder="예: 3문제를 다 풀었는데 사진이 흐려서 안 보인 것 같아요" required />
                {appeal.message && <p className="row-error">{appeal.message}</p>}
                <Button type="submit" variant="quiet" disabled={appealing}>
                  {appealing ? "보내는 중…" : "다시 봐 달라고 요청"}
                </Button>
              </form>
            ) : (
              <button type="button" className="text-btn" onClick={() => setAppealOpen(true)}>
                판정이 틀린 것 같아요
              </button>
            )}
          </div>
        )}
        {kind === "photo" && !passed && <p className="keep-note">사진은 판정에만 쓰고 7일 뒤 지워요.</p>}
      </dialog>
    </li>
  );
}

function Waiting({ children }: { children: React.ReactNode }) {
  return (
    <p className="proof-wait" role="status">
      <i />
      {children}
    </p>
  );
}
