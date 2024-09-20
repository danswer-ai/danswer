import { SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED } from "@/lib/constants";
import { StandaronyxCategory } from "@/lib/types";
import { fetchSS } from "@/lib/utilsSS";

export type StandaronyxCategoryResponse =
  | EEStandaronyxCategoryResponse
  | NoEEAvailable;

interface NoEEAvailable {
  paidEnterpriseFeaturesEnabled: false;
}

interface EEStandaronyxCategoryResponse {
  paidEnterpriseFeaturesEnabled: true;
  error?: {
    message: string;
  };
  categories?: StandaronyxCategory[];
}

export async function getStandaronyxCategoriesIfEE(): Promise<StandaronyxCategoryResponse> {
  if (!SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED) {
    return {
      paidEnterpriseFeaturesEnabled: false,
    };
  }

  const standaronyxCategoriesResponse = await fetchSS(
    "/manage/admin/standard-answer/category"
  );
  if (!standaronyxCategoriesResponse.ok) {
    return {
      paidEnterpriseFeaturesEnabled: true,
      error: {
        message: await standaronyxCategoriesResponse.text(),
      },
    };
  }

  const categories =
    (await standaronyxCategoriesResponse.json()) as StandaronyxCategory[];

  return {
    paidEnterpriseFeaturesEnabled: true,
    categories,
  };
}
