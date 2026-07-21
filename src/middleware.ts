import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNTANT_ALLOWED_PATHS, ACCOUNTANT_DEFAULT_PATH } from "@/lib/nav";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Accountant route gating — the PRD requires this enforced server-side, not
  // just via a hidden nav menu, since a direct URL visit bypasses the UI
  // entirely. RLS is the real data boundary; this stops them landing on a
  // page that renders nothing useful (or errors) for their role.
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = profile?.role ?? null;
  }
  const isAccountant = role === "accountant";
  const isAllowedForAccountant = isPublicPath || ACCOUNTANT_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (user && isAccountant && !isAllowedForAccountant) {
    if (pathname.startsWith("/api")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const redirectUrl = new URL(ACCOUNTANT_DEFAULT_PATH, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicPath) {
    const redirectUrl = new URL(isAccountant ? ACCOUNTANT_DEFAULT_PATH : "/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Forward the identity middleware already verified so downstream Server Components
  // don't need a second network round trip to Supabase Auth just to re-derive it.
  if (user) {
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email ?? "");
    const forwarded = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.getAll().forEach((cookie) => forwarded.cookies.set(cookie));
    response = forwarded;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
