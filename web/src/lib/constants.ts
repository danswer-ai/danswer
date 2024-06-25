export type AuthType = "disabled" | "basic" | "google_oauth" | "oidc" | "saml";

export const HOST_URL = process.env.WEB_DOMAIN || "http://127.0.0.1:3000";
export const INTERNAL_URL = process.env.INTERNAL_URL || "http://127.0.0.1:8080";
export const NEXT_PUBLIC_DISABLE_STREAMING =
  process.env.NEXT_PUBLIC_DISABLE_STREAMING?.toLowerCase() === "true";

export const NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED =
  process.env.NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED?.toLowerCase() ===
  "true";

export const NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA =
  process.env.NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA?.toLowerCase() ===
  "true";

export const GMAIL_AUTH_IS_ADMIN_COOKIE_NAME = "gmail_auth_is_admin";

export const GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME =
  "google_drive_auth_is_admin";

export const SEARCH_TYPE_COOKIE_NAME = "search_type";

export const HEADER_PADDING = `pt-[64px]`;

export const LOGOUT_DISABLED =
  process.env.NEXT_PUBLIC_DISABLE_LOGOUT?.toLowerCase() === "true";

/* Enterprise-only settings */

// NOTE: this should ONLY be used on the server-side. If used client side,
// it will not be accurate (will always be false).
export const SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED =
  process.env.ENABLE_PAID_ENTERPRISE_EDITION_FEATURES?.toLowerCase() === "true";

export const CUSTOM_ANALYTICS_ENABLED = process.env.CUSTOM_ANALYTICS_SECRET_KEY
  ? true
  : false;
