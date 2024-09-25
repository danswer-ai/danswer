"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User as UserTypes } from "@/lib/types";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { useState } from "react";
import { CircleCheck } from "lucide-react";

export default function SecurityTab({ user }: { user: UserTypes | null }) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const {
    hasUppercase,
    hasNumberOrSpecialChar,
    passwordWarning,
    calculatePasswordStrength,
    setPasswordFocused,
  } = usePasswordValidation();

  const handleSaveChanges = async () => {
    if (newPassword.length < 8 || !hasUppercase || !hasNumberOrSpecialChar) {
      toast({
        title: "Password doesn't meet requirements",
        description:
          passwordWarning || "Ensure your password meets all the criteria.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Your new password and confirm password do not match",
        description: `New password and confirm password must match. Please try again.`,
        variant: "destructive",
      });
      return;
    }

    const updatedPasswordInfo = {
      current_password: currentPassword,
      new_password: newPassword,
    };
    const response = await fetch("/api/users/change-password", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(updatedPasswordInfo),
    });

    if (response.status === 200) {
      toast({
        title: "Successfully updated your password",
        description: "Your password has been changed. Please log in again.",
        variant: "success",
      });
      setIsEditing(false);
    } else if (response.status === 400) {
      toast({
        title: "Incorrect current password",
        description: "Please check your current password and try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Something went wrong",
        description: `Updating your password failed: ${response.status} ${response.statusText}`,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex py-8 border-b flex-col">
        <h3>Password</h3>
        <p className="pt-1 text-sm">
          Please enter your current password to change your password
        </p>
      </div>

      <div className="py-8 border-b flex flex-col gap-8">
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

        <div>
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
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    calculatePasswordStrength(e.target.value);
                  }}
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
          {isEditing && (
            <div className="flex">
              <div className="w-[500px]" />
              <div className="text-sm text-subtle pt-2">
                <div className="flex items-center gap-2">
                  <CircleCheck
                    size={16}
                    color={newPassword.length >= 8 ? "#69c57d" : "gray"}
                  />
                  <p>At least 8 characters</p>
                </div>
                <div className="flex items-center gap-2">
                  <CircleCheck
                    size={16}
                    color={hasUppercase ? "#69c57d" : "gray"}
                  />
                  <p>At least 1 Capital letter</p>
                </div>
                <div className="flex items-center gap-2">
                  <CircleCheck
                    size={16}
                    color={hasNumberOrSpecialChar ? "#69c57d" : "gray"}
                  />
                  <p>At least 1 number or special character</p>
                </div>
                {passwordWarning && (
                  <p className="text-red-500">{passwordWarning}</p>
                )}
              </div>
            </div>
          )}
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
