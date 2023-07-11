"use client";

import {
  Notebook,
  Key,
  Trash,
  Info,
  XSquare,
  LinkBreak,
  Link,
  Plug,
  Bird,
  Brain,
} from "@phosphor-icons/react";
import {
  SiBookstack,
  SiConfluence,
  SiGithub,
  SiGoogledrive,
  SiJira,
  SiSlack,
} from "react-icons/si";
import { FaFile, FaGlobe } from "react-icons/fa";
import { IconBase } from "react-icons";
import Image from "next/image";

interface IconProps {
  size?: string;
  className?: string;
}

const defaultTailwindCSS = "text-blue-400 my-auto flex flex-shrink-0";

export const PlugIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Plug size={size} className={className} />;
};

export const NotebookIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Notebook size={size} className={className} />;
};

export const KeyIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Key size={size} className={className} />;
};

export const TrashIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Trash size={size} className={className} />;
};

export const LinkBreakIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <LinkBreak size={size} className={className} />;
};

export const LinkIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Link size={size} className={className} />;
};

export const XSquareIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <XSquare size={size} className={className} />;
};

export const GlobeIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FaGlobe size={size} className={className} />;
};

export const FileIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FaFile size={size} className={className} />;
};

export const SlackIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SiSlack size={size} className={className} />;
};

export const GithubIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SiGithub size={size} className={className} />;
};

export const GoogleDriveIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SiGoogledrive size={size} className={className} />;
};

export const BookstackIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SiBookstack size={size} className={className} />;
};

export const ConfluenceIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SiConfluence size={size} className={className} />;
};

export const JiraIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SiJira size={size} className={className} />;
};

export const SlabIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src="/SlabLogoBlue.png" alt="Logo" width="96" height="96" />
  </div>
);

export const InfoIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Info size={size} className={className} />;
};

export const BrainIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Brain size={size} className={className} />;
};

export const AlationIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <IconBase size={size} className={className} viewBox="0 0 24 24">
      <path d="M23.5001 6.92623L15.6124 10.4055L12.6016 11.7372V11.7295C12.4837 11.791 12.3519 11.8295 12.2062 11.8295C12.0119 11.8295 11.8246 11.7603 11.6789 11.6448L8.73057 9.43561L6.1152 7.48045C5.71977 7.18025 5.21335 7.3265 4.99829 7.79605L0.0936039 18.2877C-0.12839 18.7573 0.0589173 18.9805 0.502906 18.7881L11.4708 13.9617C11.5749 13.9156 11.6789 13.8925 11.7969 13.8925C11.998 13.8925 12.1784 13.9617 12.331 14.0849L17.8878 18.2415C18.2833 18.5417 18.7897 18.3955 19.0047 17.9259L23.9094 7.42657C24.1245 6.95702 23.9441 6.73379 23.5001 6.92623ZM9.40349 13.1381L3.57614 15.7091C3.36108 15.8014 3.09746 15.9169 3.02115 15.8322C2.93791 15.7399 3.05584 15.4474 3.16684 15.2087L5.5394 10.1361C5.6504 9.90516 5.80996 9.68193 6.01114 9.62035C6.21926 9.55877 6.46207 9.67423 6.66325 9.82049L8.73057 11.3677L9.55611 11.9912C9.7018 12.1143 10.0001 12.3376 10.0001 12.5531C9.99316 12.8456 9.62548 13.0457 9.40349 13.1381ZM15.6124 12.1297L20.4338 10.0052C20.4685 9.98983 20.4963 9.98213 20.531 9.97444C20.7321 9.88976 20.9472 9.80509 21.0166 9.88207C21.0929 9.97444 20.9819 10.2669 20.8709 10.5056L18.4983 15.5782C18.3873 15.8091 18.2278 16.0401 18.0335 16.0939C17.8809 16.1401 17.7144 16.0939 17.5548 16.0016C17.4855 15.9785 17.423 15.9477 17.3537 15.9015L15.6193 14.6006L14.6897 13.9002C14.662 13.8694 14.2874 13.5692 14.2666 13.5307C14.1556 13.4229 14.0515 13.2844 14.0515 13.1612C14.0515 12.938 14.2804 12.7609 14.4816 12.6532L15.6124 12.1297Z" />
    </IconBase>
  )
};
