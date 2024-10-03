import { AdminPageTitle } from "@/components/admin/Title";
import BillingInformationPage from "./BillingInformationPage";
import { fetchSS } from "@/lib/utilsSS";
import { FaCloud } from "react-icons/fa";
import { loadStripe } from "@stripe/stripe-js";

export interface BillingInformation {
  seats: number;
  subscriptionStatus: string;
  billingStart: Date;
  billingEnd: Date;
  paymentMethodEnabled: boolean;
}

export default async function page() {
  const billingInformation: BillingInformation = await fetchSS(
    "/tenants/billing-information"
  ).then((res) => res.json());

  return (
    <div className="container max-w-4xl">
      <AdminPageTitle
        title="Cloud Settings"
        icon={<FaCloud size={32} className="my-auto" />}
      />
      <BillingInformationPage billingInformation={billingInformation} />
    </div>
  );
}
