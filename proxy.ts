import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("firebaseToken")?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};