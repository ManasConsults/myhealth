import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Next.js v16 uses proxy.ts + proxy() + proxyConfig instead of middleware.ts
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Never redirect static assets — matcher may not filter these in Turbopack
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;

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
});

export const proxyConfig = {
  matcher: ["/((?!_next|favicon\\.ico).*)"],
};
