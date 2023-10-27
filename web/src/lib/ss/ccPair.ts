import { fetchSS } from "../utilsSS";

export async function getCCPairSS(ccPairId: number) {
  return fetchSS(`/manage/admin/cc-pair/${ccPairId}`);
}
