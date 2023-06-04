export const DISABLE_AUTH = process.env.DISABLE_AUTH?.toLowerCase() === "true";
export const INTERNAL_URL = process.env.INTERNAL_URL || "http://127.0.0.1:8080";

export const GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME =
  "google_drive_auth_is_admin";
