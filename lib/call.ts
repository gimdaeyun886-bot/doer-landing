// 브라우저에서 Server Action을 부를 때 쓴다. 네트워크가 끊기거나 새 버전이 배포되는 사이에 요청이 실패해도
// 화면이 말없이 멈추지 않도록, 예외를 null로 바꿔 돌려준다. 원인은 브라우저 콘솔에만 남긴다.
export const CALL_FAILED = "답을 받지 못했어요. 화면을 새로고침한 뒤 다시 보내 주세요.";

export async function safely<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch (error) {
    console.error("server action failed:", error);
    return null;
  }
}
