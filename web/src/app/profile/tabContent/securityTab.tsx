"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User as UserTypes } from "@/lib/types";
import { useState } from "react";

export default function SecurityTab({ user }: { user: UserTypes | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSaveChanges = () => {
    if (newPassword !== confirmPassword) {
      console.log("Passwords do not match");
      return;
    }

    const updatedPasswordInfo = {
      current_password: currentPassword,
      new_password: newPassword,
    };

    console.log("Password updated", updatedPasswordInfo);
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
