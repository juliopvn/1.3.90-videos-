import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySession } from "@/lib/auth/jwt";

const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/videos"];
const PROTECTED_API_PREFIXES = ["/api/videos", "/api/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (session) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/videos/:path*", "/api/videos/:path*", "/api/dashboard/:path*"],
};
