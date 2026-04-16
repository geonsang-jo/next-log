import { NextResponse } from "next/server";

export function middleware(request) {
  const langCookie = request.cookies.get("lang")?.value;

  // Migrate stale "kr" cookies from previous versions → "ko"
  if (langCookie === "kr") {
    const response = NextResponse.next();
    response.cookies.set("lang", "ko", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  }

  if (langCookie === "ko" || langCookie === "en") {
    return NextResponse.next();
  }

  // First visit (no/invalid cookie): detect from Accept-Language
  const acceptLanguage = request.headers.get("accept-language") || "";
  const detectedLang = acceptLanguage.toLowerCase().startsWith("ko")
    ? "ko"
    : "en";

  const response = NextResponse.next();
  response.cookies.set("lang", detectedLang, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
