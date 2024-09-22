export interface Settings {
  chat_page_enabled: boolean;
  search_page_enabled: boolean;
  default_page: "search" | "chat";
  maximum_chat_retention_days: number | null;
  notifications: Notification[];
  needs_reindexing: boolean;
}

export interface Notification {
  id: number;
  notif_type: string;
  dismissed: boolean;
  last_shown: string;
  first_shown: string;
}

export interface EnterpriseSettings {
  application_name: string | null;
  use_custom_logo: boolean;
  use_custom_logotype: boolean;

  // custom Chat components
  custom_lower_disclaimer_content: string | null;
  custom_header_content: string | null;
  custom_popup_header: string | null;
  custom_popup_content: string | null;
}
import { FiStar, FiDollarSign, FiAward } from "react-icons/fi";

export enum BillingPlanType {
  FREE = "free",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export interface CloudSettings {
  numberOfSeats: number;
  planType: BillingPlanType;
}

export interface CombinedSettings {
  settings: Settings;
  enterpriseSettings: EnterpriseSettings | null;
  cloudSettings: CloudSettings | null;
  customAnalyticsScript: string | null;
  isMobile?: boolean;
  webVersion: string | null;
}


export const defaultCombinedSettings: CombinedSettings = {
  settings: {
    chat_page_enabled: true,
    search_page_enabled: true,
    default_page: "search",
    maximum_chat_retention_days: 30,
    notifications: [],
    needs_reindexing: false,
  },
  enterpriseSettings: {
    application_name: "Danswer",
    use_custom_logo: false,
    use_custom_logotype: false,
    custom_lower_disclaimer_content: null,
    custom_header_content: null,
    custom_popup_header: null,
    custom_popup_content: null,
  },
  cloudSettings: {
    numberOfSeats: 0,
    planType: BillingPlanType.FREE,
  },
  customAnalyticsScript: null,
  isMobile: false,
  webVersion: null,
};