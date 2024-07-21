export function buildCCPairInfoUrl(ccPairId: string | number) {
  return `/api/manage/admin/cc-pair/${ccPairId}`;
}

export function buildSimilarCredentialInfoURL(connector_id: string | number) {
  return `/api/manage/admin/similar-credentials/${connector_id}`;
}
