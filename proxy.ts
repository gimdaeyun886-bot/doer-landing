// 요청마다 로그인 세션을 갱신하고, 로그인이 필요한 화면을 지킨다.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request: NextRequest) {
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // 쿠키에 든 세션만 읽는다(만료됐을 때만 갱신 요청). 데이터 접근은 DB의 RLS가 토큰을 다시 검증하므로, 여기서는 화면 이동만 정한다.
  const { data: sessionData } = await supabase.auth.getSession();
  const data = { user: sessionData.session?.user ?? null };
  const path = request.nextUrl.pathname;
  const isLogin = path === "/login";

  if (!data.user && !isLogin) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  // 로그인은 했지만 약관 동의를 아직 하지 않은 사람(구글·카카오 첫 로그인)은 동의 화면으로 보낸다.
  const agreed = Boolean(data.user?.user_metadata?.consent_version);
  if (data.user && !agreed && path !== "/consent") {
    const consent = request.nextUrl.clone();
    consent.pathname = "/consent";
    consent.search = "";
    return NextResponse.redirect(consent);
  }
  if (data.user && agreed && path === "/consent") {
    const home = request.nextUrl.clone();
    home.pathname = "/today";
    return NextResponse.redirect(home);
  }
  if (data.user && isLogin) {
    const home = request.nextUrl.clone();
    home.pathname = "/today";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = { matcher: ["/today/:path*", "/goals/:path*", "/settings/:path*", "/login", "/consent"] };
