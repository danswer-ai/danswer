import React from "react";
import { User as UserTypes } from "@/lib/types";
import { buildImgUrl } from "@/app/chat/files/images/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { User } from "lucide-react";
import { useGradient } from "@/hooks/useGradient";

interface UserProfileProps {
  user?: UserTypes | null;
  onClick?: () => void;
  size?: number;
  textSize?: string;
  isShared?: boolean;
}

const getNameInitials = (fullName: string) => {
  const names = fullName.split(" ");
  return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
};

export function UserProfile({
  user,
  onClick,
  size = 40,
  textSize = "text-base",
  isShared,
}: UserProfileProps) {
  const backgroundGradient =
    user && user.full_name
      ? useGradient(getNameInitials(user.full_name))
      : "linear-gradient(to right, #e2e2e2, #ffffff)";

  return (
    <Avatar
      onClick={onClick}
      style={{
        width: size,
        height: size,
      }}
    >
      {user && user.profile ? (
        <AvatarImage
          src={buildImgUrl(user.profile)}
          alt={user.full_name || "User"}
        />
      ) : (
        <AvatarFallback
          className={`text-inverted font-medium ${textSize}`}
          style={{
            background: backgroundGradient,
          }}
        >
          {user ? (
            getNameInitials(user.full_name || "")
          ) : isShared ? (
            <User />
          ) : (
            ""
          )}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
