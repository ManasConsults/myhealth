import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Next.js v16 uses proxy.ts + proxy() + proxyConfig instead of middleware.ts.
// Reads the JWT directly rather than wrapping with auth(): the wrapper re-issues the session cookie on
// every proxied request, so server actions/prefetches still in flight at logout would restore the session.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never redirect static assets — matcher may not filter these in Turbopack
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    // Auth.js names the cookie `__Secure-…` when served over https
    secureCookie: req.nextUrl.protocol === "https:",
  });
  const isLoggedIn = !!token;

  const isPublic =
    pathname === "/" ||
    pathname === "/register" ||
    pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isLoggedIn && (pathname === "/" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: ["/((?!_next|favicon\\.ico).*)"],
};
