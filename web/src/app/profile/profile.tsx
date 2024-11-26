import { User as UserTypes } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileTab from "./tabContent/ProfileTab";
import SecurityTab from "./tabContent/SecurityTab";
import { CreditCard, Link2, Lock, User, UserRoundPen } from "lucide-react";
import { CombinedSettings } from "../admin/settings/interfaces";
import MyTeamspace from "./tabContent/MyTeamspace";

export default function Profile({
  user,
  combinedSettings,
}: {
  user: UserTypes | null;
  combinedSettings: CombinedSettings | null;
}) {
  const showAdminPanel = !user || user.role === "admin";

  return (
    <div className="h-full">
      <h1 className="flex items-center font-bold text-xl md:text-[28px] text-strong gap-x-2">
        <UserRoundPen size={32} /> Profile Settings
      </h1>

      <Tabs defaultValue="profile" className="w-full pt-10">
        <TabsList>
          <TabsTrigger value="profile">
            <User size={16} className="mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="my_teamspace">
            <User size={16} className="mr-2" /> My Teamspace
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock size={16} className="mr-2" /> Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab user={user} combinedSettings={combinedSettings} />
        </TabsContent>
        <TabsContent value="my_teamspace">
          <MyTeamspace user={user} />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
