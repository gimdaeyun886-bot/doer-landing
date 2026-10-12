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
  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isLogin = path === "/login";

  if (!data.user && !isLogin) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  if (data.user && isLogin) {
    const home = request.nextUrl.clone();
    home.pathname = "/today";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = { matcher: ["/today/:path*", "/goals/:path*", "/settings/:path*", "/login"] };
