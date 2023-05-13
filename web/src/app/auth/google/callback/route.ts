import { buildUrl } from "@/lib/userSS";
import { NextRequest, NextResponse } from "next/server";

const getDomain = (request: NextRequest) => {
  // use env variable if set
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }

  // next, try and build domain from headers
  const requestedHost = request.headers.get("X-Forwarded-Host");
  const requestedPort = request.headers.get("X-Forwarded-Port");
  const requestedProto = request.headers.get("X-Forwarded-Proto");
  if (requestedHost) {
    const url = request.nextUrl.clone();
    url.host = requestedHost;
    url.protocol = requestedProto || url.protocol;
    url.port = requestedPort || url.port;
    return url.origin;
  }

  // finally just use whatever is in the request
  return request.nextUrl.origin;
};

export const GET = async (request: NextRequest) => {
  // Wrapper around the FastAPI endpoint /auth/google/callback,
  // which adds back a redirect to the main app.
  const url = new URL(buildUrl("/auth/google/callback"));
  url.search = request.nextUrl.search;

  const response = await fetch(url.toString());
  const setCookieHeader = response.headers.get("set-cookie");

  if (!setCookieHeader) {
    return NextResponse.redirect(new URL("/auth/error", getDomain(request)));
  }

  const redirectResponse = NextResponse.redirect(
    new URL("/", getDomain(request))
  );
  redirectResponse.headers.set("set-cookie", setCookieHeader);
  return redirectResponse;
};
