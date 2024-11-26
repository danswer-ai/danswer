import { FeatureFlags } from "@/app/admin/settings/interfaces";
import { fetchSS } from "@/lib/utilsSS";

export async function fetchFeatureFlagSS(): Promise<FeatureFlags> {
  const response = await fetchSS("/ff");
  if (!response.ok) {
    throw new Error(
      `fetchFeatureFlagSS failed: status=${response.status} body=${await response.text()}`
    );
  } else {
    const featureFlags: FeatureFlags = await response.json();
    return featureFlags;
  }
}
