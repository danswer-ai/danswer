import { getDomain } from "@/lib/redirectSS";
import { buildUrl } from "@/lib/utilsSS";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GMAIL_AUTH_IS_ADMIN_COOKIE_NAME,
  GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME,
} from "@/lib/constants";
import { processCookies } from "@/lib/userSS";

// export const GET = async (request: NextRequest, { params }: { params: { connector: string } }) => {
//   const connector = params.connector;
//   const isGoogleDrive = connector === 'google_drive';
//   const isGmail = connector === 'gmail';

//   const domain = getDomain(request)
//   if (!isGoogleDrive && !isGmail) {
//     return NextResponse.redirect(new URL("/auth/error", domain));
//   }

//   const callbackEndpoint = isGoogleDrive
//     ? "/manage/connector/google-drive/callback"
//     : "/manage/connector/gmail/callback";

//   const url = new URL(buildUrl(callbackEndpoint));
//   url.search = request.nextUrl.search;

//   const response = await fetch(url.toString(), {
//     headers: {
//       cookie: processCookies(cookies()),
//     },
//   });

//   if (!response.ok) {
//     console.log(
//       `Error in ${connector} callback:`,
//       (await response.json()).detail
//     );
//     return NextResponse.redirect(new URL("/auth/error", domain));
//   }

//   const authCookieName = isGoogleDrive
//     ? GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME
//     : GMAIL_AUTH_IS_ADMIN_COOKIE_NAME;

//   if (
//     cookies()
//       .get(authCookieName)
//       ?.value?.toLowerCase() === "true"
//   ) {
//     return NextResponse.redirect(
//       new URL(`/admin/connectors/${connector}`, domain)
//     );
//   }
//   return NextResponse.redirect(new URL("/user/connectors", domain));
// };

export const GET = async (request: NextRequest) => {
  console.log(request);
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
      new URL("/admin/connectors/google_drive", getDomain(request))
    );
  }
  return NextResponse.redirect(new URL("/user/connectors", getDomain(request)));
};
