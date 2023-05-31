import { getDomain } from "@/lib/redirectSS";
import { buildUrl } from "@/lib/utilsSS";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const GET = async (request: NextRequest) => {
  // Wrapper around the FastAPI endpoint /connectors/google-drive/callback,
  // which adds back a redirect to the Google Drive admin page.
  const url = new URL(buildUrl("/admin/connector/google-drive/callback"));
  url.search = request.nextUrl.search;

  const response = await fetch(url.toString(), {
    headers: {
      cookie: cookies()
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; "),
    },
  });

  if (!response.ok) {
    console.log(
      "Error in Google Drive callback:",
      (await response.json()).detail
    );
    return NextResponse.redirect(new URL("/auth/error", getDomain(request)));
  }

  return NextResponse.redirect(
    new URL("/admin/connectors/google-drive", getDomain(request))
  );
};
