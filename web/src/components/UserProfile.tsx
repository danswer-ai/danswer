import { User } from "lucide-react";
import React from "react";
import { User as UserTypes } from "@/lib/types";
import { buildImgUrl } from "@/app/chat/files/images/utils";

interface UserProfileProps {
  user?: UserTypes | null;
  onClick?: () => void;
  size?: number;
  textSize?: string;
}

const getNameInitials = (fullName: string) => {
  const names = fullName.split(" ");
  return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
};

const generateGradient = (initials: string) => {
  const color1 = "#666666";
  const color2 = "#333333";
  const color3 = "#000000";
  return `linear-gradient(to right, ${color1}, ${color2}, ${color3})`;
};

export function UserProfile({
  user,
  onClick,
  size = 40,
  textSize = "text-base",
}: UserProfileProps) {
  const backgroundGradient =
    user && user.full_name
      ? generateGradient(getNameInitials(user.full_name))
      : "linear-gradient(to right, #e2e2e2, #ffffff)";

  return (
    <div
      className={`flex items-center justify-center rounded-full aspect-square shrink-0 ${textSize} font-medium text-inverted overflow-hidden`}
      style={{
        width: size,
        height: size,
        background: backgroundGradient,
      }}
      onClick={onClick}
    >
      {user?.profile ? (
        <img
          src={buildImgUrl(user.profile)}
          alt="User profile"
          className="w-full h-full object-cover rounded-full"
          width={size}
          height={size}
        />
      ) : user?.full_name ? (
        <span className={`${textSize} font-semibold`}>
          {getNameInitials(user.full_name)}
        </span>
      ) : (
        <User size={24} className="mx-auto" />
      )}
    </div>
  );
}
