import { getDomain } from "@/lib/redirectSS";
import { buildUrl } from "@/lib/utilsSS";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME } from "@/lib/constants";
import { processCookies } from "@/lib/userSS";

export const GET = async (request: NextRequest) => {
  // Wrapper around the FastAPI endpoint /connectors/google-drive/callback,
  // which adds back a redirect to the Google Drive admin page.
  const url = new URL(buildUrl("/manage/connector/google-drive/callback"));
  url.search = request.nextUrl.search;

  const response = await fetch(url.toString(), {
    headers: {
      cookie: processCookies(cookies()),
    },
  });

  if (!response.ok) {
    console.log(
      "Error in Google Drive callback:",
      (await response.json()).detail
    );
    return NextResponse.redirect(new URL("/auth/error", getDomain(request)));
  }

  if (
    cookies()
      .get(GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME)
      ?.value?.toLowerCase() === "true"
  ) {
    return NextResponse.redirect(
      new URL("/admin/connectors/google-drive", getDomain(request))
    );
  }
  return NextResponse.redirect(new URL("/user/connectors", getDomain(request)));
};
