import { BillingSettings } from "./BillingSettings";
import { AdminPageTitle } from "@/components/admin/Title";
import { CreditCardIcon } from "@/components/icons/icons";

export default async function Whitelabeling() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Billing"
        icon={<CreditCardIcon size={32} className="my-auto" />}
      />

      <BillingSettings />
    </div>
  );
}
