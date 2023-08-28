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
  Brain,
  PencilSimple,
  X,
  Question,
  Users,
  ThumbsUp,
} from "@phosphor-icons/react";
import { SiBookstack } from "react-icons/si";
import { FaFile, FaGlobe } from "react-icons/fa";
import Image from "next/image";
import jiraSVG from "../../../public/Jira.svg";
import confluenceSVG from "../../../public/Confluence.svg";
import guruIcon from "../../../public/Guru.svg";
import zulipIcon from "../../../public/Zulip.png";
import linearIcon from "../../../public/Linear.png";

interface IconProps {
  size?: number;
  className?: string;
}

const defaultTailwindCSS = "my-auto flex flex-shrink-0 text-blue-400";

export const PlugIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Plug size={size} className={className} />;
};

export const NotebookIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Notebook size={size} className={className} />;
};

export const KeyIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Key size={size} className={className} />;
};

export const UsersIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Users size={size} className={className} />;
};

export const TrashIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Trash size={size} className={className} />;
};

export const LinkBreakIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <LinkBreak size={size} className={className} />;
};

export const LinkIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Link size={size} className={className} />;
};

export const XSquareIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <XSquare size={size} className={className} />;
};

export const GlobeIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FaGlobe size={size} className={className} />;
};

export const FileIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FaFile size={size} className={className} />;
};

export const InfoIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Info size={size} className={className} />;
};

export const QuestionIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Question size={size} className={className} />;
};

export const BrainIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Brain size={size} className={className} />;
};

export const PencilIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <PencilSimple size={size} className={className} />;
};

export const XIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <X size={size} className={className} />;
};

export const ThumbsUpIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <ThumbsUp size={size} className={className} />;
};

//
//  COMPANY LOGOS
//

export const SlackIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src="/Slack.png" alt="Logo" width="96" height="96" />
    </div>
  );
};

export const GithubIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src="/Github.png" alt="Logo" width="96" height="96" />
    </div>
  );
};

export const GoogleDriveIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src="/GoogleDrive.png" alt="Logo" width="96" height="96" />
    </div>
  );
};

export const BookstackIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SiBookstack size={size} className={className + " text-[#0288D1]"} />;
};

export const ConfluenceIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={confluenceSVG} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const JiraIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  // Jira Icon has a bit more surrounding whitespace than other icons, which is why we need to adjust it here
  return (
    <div
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={jiraSVG} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const ZulipIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src={zulipIcon} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const ProductboardIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src="/Productboard.webp" alt="Logo" width="96" height="96" />
    </div>
  );
};

export const LinearIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      // Linear Icon has a bit more surrounding whitespace than other icons, which is why we need to adjust it here
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={linearIcon} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const SlabIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src="/SlabLogo.png" alt="Logo" width="96" height="96" />
  </div>
);

export const NotionIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src="/Notion.png" alt="Logo" width="96" height="96" />
    </div>
  );
};

export const GuruIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={guruIcon} alt="Logo" width="96" height="96" />
  </div>
);
