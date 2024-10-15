import { CLOUD_ENABLED } from "@/lib/constants";
import { getAuthTypeMetadataSS, logoutSS } from "@/lib/userSS";
import { NextRequest } from "next/server";

export const POST = async (request: NextRequest) => {
  // Directs the logout request to the appropriate FastAPI endpoint.
  // Needed since env variables don't work well on the client-side
  const authTypeMetadata = await getAuthTypeMetadataSS();
  const response = await logoutSS(authTypeMetadata.authType, request.headers);

  // Delete cookies only if cloud is enabled (jwt auth)
  if (CLOUD_ENABLED) {
    const cookiesToDelete = ["fastapiusersauth", "tenant_details"];
    const cookieOptions = {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
    };

    if (!response || response.ok) {
      const newResponse = new Response(null, { status: 204 });
      cookiesToDelete.forEach((cookieName) => {
        newResponse.headers.append(
          "Set-Cookie",
          `${cookieName}=; Max-Age=0; ${Object.entries(cookieOptions)
            .map(([key, value]) => `${key}=${value}`)
            .join("; ")}`
        );
      });
      return newResponse;
    }

    const newResponse = new Response(response.body, {
      status: response?.status,
    });
    cookiesToDelete.forEach((cookieName) => {
      newResponse.headers.append(
        "Set-Cookie",
        `${cookieName}=; Max-Age=0; ${Object.entries(cookieOptions)
          .map(([key, value]) => `${key}=${value}`)
          .join("; ")}`
      );
    });
    return newResponse;
  }

  return response;
};
