"use client";

import { Button } from "@/components/ui/button";
import { User as UserTypes } from "@/lib/types";
import { User } from "lucide-react";
import { UserProfile } from "@/components/UserProfile";
import { CombinedSettings } from "@/components/settings/lib";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function ProfileTab({
  user,
  combinedSettings,
}: {
  user: UserTypes | null;
  combinedSettings: CombinedSettings | null;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [companyName, setCompanyName] = useState(user?.company_name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSaveChanges = async () => {
    const updatedUser = {
      full_name: fullName,
      company_name: companyName,
    };
    const response = await fetch("/api/users/me", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
      body: JSON.stringify(updatedUser),
    });
    if (response.status == 200) {
      toast({
        title: "Successfully edited user information",
        description: "You have successfully updated your personal information.",
        variant: "success",
      });
    } else {
      toast({
        title: "Something went wrong during update",
        description: `Error: ${response}`,
        variant: "destructive",
      });
    }
    setIsEditing(false);
  };

  return (
    <>
      <div className="flex py-8 border-b">
        <div className="w-[500px] text-sm">
          <span className="font-semibold text-inverted-inverted">
            Your Photo
          </span>
          <p className="pt-1">This will be displayed on your profile.</p>
        </div>
        <div className="flex items-center justify-between gap-3 w-[500px]">
          <div className="flex items-center justify-center rounded-full h-[65px] w-[65px] shrink-0 aspect-square text-2xl font-normal">
            {user && user.full_name ? (
              <UserProfile size={65} user={user} textSize="text-2xl" />
            ) : (
              <User size={25} className="mx-auto" />
            )}
          </div>
        </div>
      </div>

      <div className="py-8 border-b flex flex-col gap-5">
        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">Name</span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            {isEditing ? (
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            ) : (
              <span className="font-semibold text-inverted-inverted">
                {fullName || "Unknown User"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              Company
            </span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            {isEditing ? (
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            ) : (
              <span className="font-semibold text-inverted-inverted">
                {companyName || "No Company"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">Email</span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            {isEditing ? (
              <Input
                disabled
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            ) : (
              <span className="font-semibold text-inverted-inverted">
                {email || "anonymous@gmail.com"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* {combinedSettings?.featureFlags.multi_teamspace && (
        <div className="flex py-8 border-b">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              Teamspaces Joined
            </span>
            <p className="w-3/4 pt-1">
              Easily switch between them and access both accounts from any
              device.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-[500px]">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Image src={Logo} alt="Logo" width={65} height={65} />
                <span className="font-semibold text-inverted-inverted">
                  Vanguard AI
                </span>
              </div>

              <Button variant="outline">Manage Team</Button>
            </div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Image src={Logo} alt="Logo" width={65} height={65} />
                <span className="font-semibold text-inverted-inverted">
                  Vanguard AI
                </span>
              </div>

              <Button variant="outline">Manage Team</Button>
            </div>
          </div>
        </div>
      )}  */}

      <div className="flex gap-2 py-8 justify-end">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              className="border-destructive-foreground hover:bg-destructive-foreground"
              onClick={() => setIsEditing(!isEditing)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            Edit
          </Button>
        )}
      </div>
    </>
  );
}
