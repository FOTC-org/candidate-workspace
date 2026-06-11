import { type NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest): NextResponse {
  const redirectTo = request.nextUrl.searchParams.get("redirect") ?? "/login";

  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  const cookieOptions = "path=/; Max-Age=0; SameSite=Strict";
  response.headers.append("Set-Cookie", `accessToken=; ${cookieOptions}`);
  response.headers.append("Set-Cookie", `refreshToken=; ${cookieOptions}`);
  response.headers.append("Set-Cookie", `userRole=; ${cookieOptions}`);

  return response;
}
