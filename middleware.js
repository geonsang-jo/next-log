import { NextResponse } from "next/server";

export function middleware(request) {
  const langCookie = request.cookies.get("lang")?.value;

  // If lang cookie already exists, skip detection
  if (langCookie) {
    return NextResponse.next();
  }

  // Detect language from Accept-Language header on first visit
  const acceptLanguage = request.headers.get("accept-language") || "";
  const detectedLang = acceptLanguage.toLowerCase().startsWith("en")
    ? "en"
    : "kr";

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
