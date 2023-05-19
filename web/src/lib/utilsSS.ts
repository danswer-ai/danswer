import { INTERNAL_URL } from "./constants";

export const buildUrl = (path: string) => {
  if (path.startsWith("/")) {
    return `${INTERNAL_URL}${path}`;
  }
  return `${INTERNAL_URL}/${path}`;
};
