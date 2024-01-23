export type AuthType = "disabled" | "basic" | "google_oauth" | "oidc" | "saml";

export const INTERNAL_URL = process.env.INTERNAL_URL || "http://127.0.0.1:8080";
export const NEXT_PUBLIC_DISABLE_STREAMING =
  process.env.NEXT_PUBLIC_DISABLE_STREAMING?.toLowerCase() === "true";

export const GMAIL_AUTH_IS_ADMIN_COOKIE_NAME = "gmail_auth_is_admin";

export const GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME =
  "google_drive_auth_is_admin";

export const SEARCH_TYPE_COOKIE_NAME = "search_type";

export const HEADER_PADDING = "pt-[64px]";
