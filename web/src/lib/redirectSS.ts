import { NextRequest } from "next/server";

export const getDomain = (request: NextRequest) => {
  // use env variable if set
  if (process.env.WEB_DOMAIN) {
    return process.env.WEB_DOMAIN;
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
