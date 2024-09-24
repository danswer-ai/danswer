"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User as UserTypes } from "@/lib/types";
import { useState } from "react";

export default function SecurityTab({ user }: { user: UserTypes | null }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSaveChanges = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Your new password and confirm password does not match",
        description: `New password and confirm password must match. Please try again`,
        variant: "destructive",
      });
      return;
    }

    const updatedPasswordInfo = {
      current_password: currentPassword,
      new_password: newPassword,
    };
    fetch("/api/users/change-password", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(updatedPasswordInfo),
    })
      .then((res) => {
        if (res.status == 200) {
          toast({
            title: "Successfully updated your password",
            description: "Your password has been changed. Please Log in again",
            variant: "success",
          });
        } else {
          toast({
            title: "Something went wrong",
            description: `Updating your password failed: ${res.status} ${res.statusText}`,
            variant: "destructive",
          });
        }
      })
      .catch((e: Error) => {
        toast({
          title: "Something went wrong",
          description: `Updating your password failed: ${e.message}`,
          variant: "destructive",
        });
      });
    setIsEditing(false);
  };

  return (
    <>
      <div className="py-8 border-b flex flex-col gap-5">
        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              Current Password
            </span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            {isEditing ? (
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full"
                placeholder="Enter current password"
              />
            ) : (
              <span className="font-semibold text-inverted-inverted">
                &#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              New Password
            </span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            {isEditing ? (
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full"
                placeholder="Enter new password"
              />
            ) : (
              <span className="font-semibold text-inverted-inverted">
                &#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-[500px] text-sm">
            <span className="font-semibold text-inverted-inverted">
              Confirm Password
            </span>
          </div>
          <div className="w-[500px] h-10 flex items-center justify-between">
            {isEditing ? (
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full"
                placeholder="Confirm new password"
              />
            ) : (
              <span className="font-semibold text-inverted-inverted">
                &#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;
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
