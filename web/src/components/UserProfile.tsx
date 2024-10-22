/* import { User } from "lucide-react";
import React from "react";
const getNameInitials = (fullName: string) => {
  const names = fullName.split(" ");
  return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
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
} */
/* import { User } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";

interface UserProfileProps {
  user?: { full_name?: string } | null;
  onClick?: () => void;
  size?: number;
  textSize?: string;
}

const getNameInitials = (fullName: string) => {
  const names = fullName.split(" ");
  return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
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
      className={`flex items-center justify-center rounded-full aspect-square ${textSize} font-medium text-inverted overflow-hidden`}
      style={{
        minWidth: size,
        maxWidth: size,
        minHeight: size,
        maxHeight: size,
        background: backgroundGradient,
      }}
      onClick={onClick}
    >
      <Image
        src={`/api/me/profile?u=${Date.now()}`}
        alt="User profile"
        className="w-full h-full object-cover rounded-full"
        width={size}
        height={size}
      />
    </div>
  );
} */

/* useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const response = await fetch(`/api/me/profile?u=${Date.now()}`);

        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setImageUrl(imageUrl);
        } else {
          console.error(
            `Error fetching profile image: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        console.error("Error fetching profile image:", error);
      }
    };

    fetchProfileImage();
  }, []); */

/*   const fetchImage = async () => {
    const response = await fetch(`/api/me/profile?u=${Date.now()}`);
    if (response.ok) {
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setImageUrl(imageUrl);
    } else {
      console.error(
        `Error fetching profile image: ${response.status} ${response.statusText}`
      );
    }
  };

  useEffect(() => {
    fetchImage();
  }, []); */

import { User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface UserProfileProps {
  user?: { full_name?: string } | null;
  onClick?: () => void;
  size?: number;
  textSize?: string;
}

const getNameInitials = (fullName: string) => {
  const names = fullName.split(" ");
  return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
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

/* export function UserProfile({
  user,
  onClick,
  size = 40,
  textSize = "text-xl",
}: UserProfileProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(
    `/api/me/profile?u=${Date.now()}`
  );
  const [imageError, setImageError] = useState(false);

  const backgroundGradient =
    user && user.full_name
      ? generateGradient(getNameInitials(user.full_name))
      : "linear-gradient(to right, #e2e2e2, #ffffff)";

  return (
    <div
      className={`flex items-center justify-center rounded-full aspect-square ${textSize} font-medium text-inverted overflow-hidden`}
      style={{
        width: size,
        height: size,
        background: "red",
      }}
      onClick={onClick}
    >
      {imageUrl && !imageError ? (
        <Image
          src={`/api/me/profile?u=${Date.now()}`}
          alt="User profile"
          className="w-full h-full object-cover rounded-full"
          width={size}
          height={size}
          onError={() => setImageError(true)}
        />
      ) : user && user.full_name ? (
        <span className="text-lg font-semibold">
          {getNameInitials(user.full_name)}
        </span>
      ) : (
        <User size={24} className="mx-auto" />
      )}
    </div>
  );
} */

export function UserProfile({
  user,
  onClick,
  size = 40,
  textSize = "text-xl",
}: UserProfileProps) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string>(
    `/api/me/profile?u=${Date.now()}`
  );
  const [imageError, setImageError] = useState(false);
  console.log(user?.full_name);
  const backgroundGradient =
    user && user.full_name
      ? generateGradient(getNameInitials(user.full_name))
      : "linear-gradient(to right, #e2e2e2, #ffffff)";

  // Reset the image URL if there is an error
  useEffect(() => {
    if (imageError) {
      setImageUrl(`/api/me/profile?u=${Date.now()}`);
      setImageError(false); // Reset the error state
    }
  }, []);

  return (
    <div
      className={`flex items-center justify-center rounded-full aspect-square ${textSize} font-medium text-inverted overflow-hidden`}
      style={{
        width: size,
        height: size,
        background: backgroundGradient,
      }}
      onClick={onClick}
    >
      <Image
        src={imageUrl}
        alt="User profile"
        className="w-full h-full object-cover rounded-full"
        width={size}
        height={size}
        onError={() => setImageError(true)}
      />
      {imageError ? (
        user && user.full_name ? (
          <span className="text-lg font-semibold">
            {getNameInitials(user.full_name)}
          </span>
        ) : (
          <User size={24} className="mx-auto" />
        )
      ) : null}
    </div>
  );
}
