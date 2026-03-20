import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  if (nextUrl.pathname.startsWith("/app") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/api/auth/signin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app/:path*"],
};
