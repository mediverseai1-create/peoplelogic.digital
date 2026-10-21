import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/app", "/onboarding", "/invite"];

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isProtected = PROTECTED.some((p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + "/"));
  if (!url || !key) {
    // Without configuration nothing protected can work; send users to the honest setup page.
    if (isProtected) return NextResponse.redirect(new URL("/setup-required", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const dest = new URL("/sign-in", request.url);
    dest.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(dest);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|templates/).*)"],
};
