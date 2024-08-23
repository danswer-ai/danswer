import { User as UserTypes } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileTab from "./tabContent/profileTab";
import SecurityTab from "./tabContent/securityTab";
import { CreditCard, Link2, Lock, User } from "lucide-react";

export default function Profile({ user }: { user: UserTypes | null }) {
  return (
    <div className="h-full overflow-x-hidden">
      <h1 className="text-black text-3xl font-semibold">User Settings</h1>

      <Tabs defaultValue="profile" className="w-full pt-10">
        <TabsList>
          <TabsTrigger value="profile">
            <User size={16} className="mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock size={16} className="mr-2" /> Security
          </TabsTrigger>
          <TabsTrigger value="billings">
            <CreditCard size={16} className="mr-2" /> Billings
          </TabsTrigger>
          <TabsTrigger value="linked-accounts">
            <Link2 size={16} className="mr-2" /> Linked Accounts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab user={user} />
        </TabsContent>
        <TabsContent value="billings">
          <SecurityTab user={user} />
        </TabsContent>
        <TabsContent value="linked-accounts">
          <SecurityTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
