import { buildUrl } from "@/lib/userSS";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  // Wrapper around the FastAPI endpoint /auth/google/callback,
  // which adds back a redirect to the main app.
  const url = new URL(buildUrl("/auth/google/callback"));
  url.search = request.nextUrl.search;

  const response = await fetch(url.toString());
  const setCookieHeader = response.headers.get("set-cookie");

  if (!setCookieHeader) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const redirectResponse = NextResponse.redirect(new URL("/", request.url));
  redirectResponse.headers.set("set-cookie", setCookieHeader);
  return redirectResponse;
};
