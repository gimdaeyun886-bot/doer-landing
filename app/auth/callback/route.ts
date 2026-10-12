// 구글·카카오 로그인을 마치고 돌아오는 곳. 받은 코드를 로그인 세션으로 바꾼다.
import { NextResponse, type NextRequest } from "next/server";
import { getSupabase, isConfigured } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const target = request.nextUrl.clone();
  target.search = "";
  if (code && isConfigured()) {
    const { error } = await (await getSupabase()).auth.exchangeCodeForSession(code);
    if (!error) {
      // 동의를 아직 안 한 사람은 proxy.ts가 동의 화면으로 보낸다.
      target.pathname = "/today";
      return NextResponse.redirect(target);
    }
    console.error("oauth callback failed:", error.message);
  }
  target.pathname = "/login";
  target.search = "?failed=1";
  return NextResponse.redirect(target);
}
