import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

// Optimistic, cookie-only checks. Real authorization (role, active status)
// happens in the DAL (src/lib/dal.ts) close to the data — see
// node_modules/next/dist/docs/01-app/02-guides/authentication.md.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin") && !isLoginRoute;

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(cookie);

  if (isAdminRoute && !session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && session) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
