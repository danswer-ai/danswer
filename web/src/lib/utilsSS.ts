import { cookies } from "next/headers";
import { INTERNAL_URL } from "./constants";

export function buildUrl(path: string) {
  if (path.startsWith("/")) {
    return `${INTERNAL_URL}${path}`;
  }
  return `${INTERNAL_URL}/${path}`;
}

export function fetchSS(
  url: string,
  options?: RequestInit,
  addRandomTimestamp: boolean = false
) {
  const init = options || {
    credentials: "include",
    cache: "no-store",
    headers: {
      cookie: cookies()
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; "),
    },
  };

  // add a random timestamp to force NextJS to refetch rather than
  // used cached data
  if (addRandomTimestamp) {
    const timestamp = Date.now();
    url = `${url}?u=${timestamp}`;
  }
  return fetch(buildUrl(url), init);
}
