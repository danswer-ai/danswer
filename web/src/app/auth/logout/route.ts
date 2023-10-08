import { getDomain } from "@/lib/redirectSS";
import { getAuthTypeSS, logoutSS } from "@/lib/userSS";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  // Directs the logout request to the appropriate FastAPI endpoint.
  // Needed since env variables don't work well on the client-side
  const authType = await getAuthTypeSS();
  const response = await logoutSS(authType, request.headers);
  if (response && response.ok) {
    return NextResponse.redirect(new URL("/auth/login", getDomain(request)));
  }
  return new Response(null, { status: 204 });
};
