import { User } from "lucide-react";
import React from "react";

const colors = ["#f9a8d4", "#8b5cf6", "#34d399", "#60a5fa", "#f472b6"];

const getRandomColorPair = () => {
  const index1 = Math.floor(Math.random() * colors.length);
  let index2 = Math.floor(Math.random() * colors.length);
  while (index2 === index1) {
    index2 = Math.floor(Math.random() * colors.length);
  }
  return [colors[index1], colors[index2]];
};

const generateGradient = () => {
  const [color1, color2] = getRandomColorPair();
  return `linear-gradient(135deg, ${color1}, ${color2})`;
};

function getNameInitials(full_name: string) {
  const names = full_name.split(" ");
  return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
}

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
  const backgroundGradient = generateGradient();

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
