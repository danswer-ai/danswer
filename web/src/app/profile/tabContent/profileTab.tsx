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
        description: `Error: ${response.statusText}`,
        variant: "destructive",
      });
    }
    setIsEditing(false);
  };

  return (
    <>
      <div className="flex py-8 border-b">
        <div className="w-44 sm:w-96 lg:w-[500px] shrink-0">
          <span className="font-semibold text-inverted-inverted">
            Your Photo
          </span>
          <p className="pt-1 text-sm">
            This will be displayed on your profile.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 md:w-[500px]">
          <div className="flex items-center justify-center rounded-full h-[65px] w-[65px] shrink-0 aspect-square text-2xl font-normal">
            {user && user.full_name ? (
              <UserProfile size={65} user={user} textSize="text-2xl" />
            ) : (
              <User size={25} className="mx-auto" />
            )}
          </div>
        </div>
      </div>

      <div className="py-8 border-b flex flex-col gap-8">
        <div className="flex items-center">
          <div className="w-44 sm:w-96 lg:w-[500px] shrink-0">
            <span className="font-semibold text-inverted-inverted">Name</span>
          </div>
          <div className="md:w-[500px] h-10 flex items-center justify-between truncate">
            {isEditing ? (
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            ) : (
              <span className="font-semibold text-inverted-inverted w-full truncate">
                {fullName || "Unknown User"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-44 sm:w-96 lg:w-[500px] shrink-0">
            <span className="font-semibold text-inverted-inverted">
              Company
            </span>
          </div>
          <div className="md:w-[500px] h-10 flex items-center justify-between truncate">
            {isEditing ? (
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            ) : (
              <span className="font-semibold text-inverted-inverted w-full truncate">
                {companyName || "No Company"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-44 sm:w-96 lg:w-[500px] shrink-0">
            <span className="font-semibold text-inverted-inverted">Email</span>
          </div>
          <div className="md:w-[500px] h-10 flex items-center justify-between truncate">
            {isEditing ? (
              <Input
                disabled
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            ) : (
              <span className="font-semibold text-inverted-inverted w-full truncate">
                {email || "anonymous@gmail.com"}
              </span>
            )}
          </div>
        </div>
      </div>

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
