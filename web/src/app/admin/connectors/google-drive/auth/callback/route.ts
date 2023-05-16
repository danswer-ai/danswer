import { getDomain } from "@/lib/redirectSS";
import { buildUrl } from "@/lib/userSS";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  // Wrapper around the FastAPI endpoint /connectors/google-drive/callback,
  // which adds back a redirect to the Google Drive admin page.
  const url = new URL(buildUrl("/admin/connectors/google-drive/callback"));
  url.search = request.nextUrl.search;

  const response = await fetch(url.toString());

  if (!response.ok) {
    return NextResponse.redirect(new URL("/auth/error", getDomain(request)));
  }

  return NextResponse.redirect(
    new URL("/admin/connectors/google-drive", getDomain(request))
  );
};
