import { User as UserTypes } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileTab from "./tabContent/profileTab";
import SecurityTab from "./tabContent/securityTab";
import { CreditCard, Link2, Lock, User, UserRoundPen } from "lucide-react";
import BillingTab from "./tabContent/billingTab";

export default function Profile({ user }: { user: UserTypes | null }) {
  return (
    <div className="h-full py-24 md:py-32 lg:pt-16">
      <h1 className="flex items-center font-bold text-xl md:text-[28px] text-strong gap-x-2">
        <UserRoundPen size={32} /> User Settings
      </h1>

      <Tabs defaultValue="profile" className="w-full pt-10">
        <TabsList>
          <TabsTrigger value="profile">
            <User size={16} className="mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock size={16} className="mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard size={16} className="mr-2" /> Billing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab user={user} />
        </TabsContent>
        <TabsContent value="billing">
          <BillingTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
