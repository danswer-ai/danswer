import { AdminPageTitle } from "@/components/admin/Title";
import BillingInformationPage from "./BillingInformationPage";
import { FaCloud } from "react-icons/fa";

export interface BillingInformation {
  seats: number;
  subscriptionStatus: string;
  billingStart: Date;
  billingEnd: Date;
  paymentMethodEnabled: boolean;
}

export default async function page() {
  return (
    <div className="container max-w-4xl">
      <AdminPageTitle
        title="Cloud Settings"
        icon={<FaCloud size={32} className="my-auto" />}
      />
      <BillingInformationPage />
    </div>
  );
}
