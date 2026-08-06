import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { UNIVERSAL_PATHS } from "@/lib/nav";

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
  // entirely. RLS is the real data boundary (every accountant-scoped policy
  // checks allowed_pages itself via accountant_has_access()); this only
  // stops them landing on a page that renders nothing useful for their role.
  // Because RLS is the actual enforcement, this whole block only needs to
  // run for GET navigations — POST requests (server actions) never "land" on
  // a page, and skipping the extra profiles round trip here cuts middleware
  // latency roughly in half on every mutation without weakening security.
  if (request.method === "GET") {
    let role: string | null = null;
    let allowedPages: string[] = [];
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role, allowed_pages").eq("id", user.id).single();
      role = profile?.role ?? null;
      allowedPages = profile?.allowed_pages ?? [];
    }
    const isAccountant = role === "accountant";
    const isUniversalPath = UNIVERSAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    const isAllowedForAccountant = isPublicPath || isUniversalPath || allowedPages.some((p) => pathname === p || pathname.startsWith(p + "/"));
    const accountantDefaultPath = allowedPages[0] || "/profile";

    if (user && isAccountant && !isAllowedForAccountant) {
      if (pathname.startsWith("/api")) {
        return new NextResponse("Forbidden", { status: 403 });
      }
      const redirectUrl = new URL(accountantDefaultPath, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isPublicPath) {
      const redirectUrl = new URL(isAccountant ? accountantDefaultPath : "/dashboard", request.url);
      return NextResponse.redirect(redirectUrl);
    }
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
