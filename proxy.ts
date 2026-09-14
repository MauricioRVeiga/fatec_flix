import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { features } from "@/config/features";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { sanitizeNextPath } from "@/lib/utils";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/api/cron/") || pathname === "/api/health";
}

export async function proxy(request: NextRequest) {
  const { response: sessionResponse, user } = await updateSupabaseSession(request);

  const pathname = request.nextUrl.pathname;
  const isLoginPath = pathname === "/login";
  const isAuthorizedAdmin = Boolean(user && ADMIN_EMAIL && user.email === ADMIN_EMAIL);

  if (!isAuthorizedAdmin && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copySessionCookies(sessionResponse, redirectResponse);
    return redirectResponse;
  }

  if (isLoginPath && isAuthorizedAdmin) {
    const target = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    copySessionCookies(sessionResponse, redirectResponse);
    return redirectResponse;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' https: data:`,
    `font-src 'self' data:`,
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    features.externalEmbeds ? `frame-src https:` : `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  copySessionCookies(sessionResponse, response);

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

function copySessionCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|opengraph-image|twitter-image|manifest.webmanifest).*)",
  ],
};
