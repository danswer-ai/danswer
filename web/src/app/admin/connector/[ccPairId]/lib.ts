export function buildCCPairInfoUrl(ccPairId: string | number) {
  return `/api/manage/admin/cc-pair/${ccPairId}`;
}

export function buildSimilarCredentialInfoURL(ccPairId: string | number) {
  return `/api/manage/admin/similar-credentials/${ccPairId}`;
}
