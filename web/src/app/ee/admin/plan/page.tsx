import { BillingSettings } from "./BillingSettings";
import { AdminPageTitle } from "@/components/admin/Title";
import { CreditCardIcon } from "@/components/icons/icons";
import { cookies } from "next/headers";

export default async function Whitelabeling() {
  const newUser =
    cookies().get("new_auth_user")?.value.toLocaleLowerCase() === "true";

  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Billing"
        icon={<CreditCardIcon size={32} className="my-auto" />}
      />
      <BillingSettings newUser={newUser} />
    </div>
  );
}
