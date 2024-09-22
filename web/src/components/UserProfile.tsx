import { User } from "lucide-react";
import React from "react";
const getNameInitials = (fullName: string) => {
  const names = fullName.split(" ");
  const initials = names.map((name) => name[0]?.toUpperCase() || "").join("");
  return initials;
};
const generateGradient = (initials: string) => {
  const colors = {
    primary: "#2039f3",
    primaryForeground: "#b8d7ff",
    success: "#69c57d",
  };
  const color1 =
    initials.charCodeAt(0) % 2 === 0 ? colors.primary : colors.success;
  const color2 =
    initials.charCodeAt(1) % 2 === 0
      ? colors.primaryForeground
      : colors.success;
  const color3 =
    initials.charCodeAt(2) % 2 === 0
      ? colors.primary
      : colors.primaryForeground;
  return `linear-gradient(to right, ${color1}, ${color2}, ${color3})`;
};
interface UserProfileProps {
  user?: { full_name?: string } | null;
  onClick?: () => void;
  size?: number;
  textSize?: string;
}
export function UserProfile({
  user,
  onClick,
  size = 40,
  textSize = "text-xl",
}: UserProfileProps) {
  const backgroundGradient =
    user && user.full_name
      ? generateGradient(getNameInitials(user.full_name))
      : "linear-gradient(to right, #e2e2e2, #ffffff)";
  return (
    <div
      className={`flex items-center justify-center rounded-full aspect-square ${textSize} font-medium text-inverted py-2`}
      style={{
        minWidth: size,
        maxWidth: size,
        minHeight: size,
        maxHeight: size,
        background: backgroundGradient,
      }}
      onClick={onClick}
    >
      {user && user.full_name ? (
        getNameInitials(user.full_name)
      ) : (
        <User size={24} className="mx-auto" />
      )}
    </div>
  );
}
