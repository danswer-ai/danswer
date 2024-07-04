"use client";

import {
  Notebook,
  Key,
  Trash,
  XSquare,
  LinkBreak,
  Link,
  Plug,
  Brain,
  X,
  Question,
  Gear,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import {
  FiCheck,
  FiChevronsDown,
  FiChevronsUp,
  FiEdit2,
  FiFile,
  FiGlobe,
  FiThumbsDown,
  FiThumbsUp,
  FiChevronDown,
  FiChevronUp,
  FiAlertCircle,
  FiChevronRight,
  FiChevronLeft,
  FiAlertTriangle,
  FiZoomIn,
  FiCopy,
  FiBookmark,
  FiCpu,
  FiInfo,
  FiUploadCloud,
  FiUser,
  FiUsers,
  FiBarChart2,
  FiDatabase,
} from "react-icons/fi";
import { SiBookstack } from "react-icons/si";
import Image from "next/image";
import jiraSVG from "../../../public/Jira.svg";
import confluenceSVG from "../../../public/Confluence.svg";
import OCIStorageSVG from "../../../public/OCI.svg";
import googleCloudStorageIcon from "../../../public/GoogleCloudStorage.png";
import guruIcon from "../../../public/Guru.svg";
import gongIcon from "../../../public/Gong.png";
import requestTrackerIcon from "../../../public/RequestTracker.png";
import zulipIcon from "../../../public/Zulip.png";
import linearIcon from "../../../public/Linear.png";
import hubSpotIcon from "../../../public/HubSpot.png";
import document360Icon from "../../../public/Document360.png";
import googleSitesIcon from "../../../public/GoogleSites.png";
import zendeskIcon from "../../../public/Zendesk.svg";
import dropboxIcon from "../../../public/Dropbox.png";
import s3Icon from "../../../public/S3.png";
import r2Icon from "../../../public/r2.webp";
import salesforceIcon from "../../../public/Salesforce.png";
import sharepointIcon from "../../../public/Sharepoint.png";
import teamsIcon from "../../../public/Teams.png";
import mediawikiIcon from "../../../public/MediaWiki.svg";
import wikipediaIcon from "../../../public/Wikipedia.svg";
import discourseIcon from "../../../public/Discourse.png";
import clickupIcon from "../../../public/Clickup.svg";
import { FaRobot } from "react-icons/fa";
import { IconType } from "react-icons";

interface IconProps {
  size?: number;
  className?: string;
}

export const ConfigureIcon = ({
  size,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 24 24"
    >
      <g fill="none" stroke="currentColor" stroke-width="1.5">
        <path
          stroke-linecap="round"
          d="M21.483 19c-.04.936-.165 1.51-.569 1.914c-.586.586-1.528.586-3.414.586c-1.886 0-2.828 0-3.414-.586c-.586-.586-.586-1.528-.586-3.414v-2c0-1.886 0-2.828.586-3.414c.586-.586 1.528-.586 3.414-.586c1.886 0 2.828 0 3.414.586c.532.531.581 1.357.585 2.914"
        />
        <path d="M2 8.5c0 1.886 0 2.828.586 3.414c.586.586 1.528.586 3.414.586c1.886 0 2.828 0 3.414-.586C10 11.328 10 10.386 10 8.5v-2c0-1.886 0-2.828-.586-3.414C8.828 2.5 7.886 2.5 6 2.5c-1.886 0-2.828 0-3.414.586C2 3.672 2 4.614 2 6.5v2Z" />
        <path
          stroke-linecap="round"
          d="M15.5 2.513c-.327.017-.562.055-.765.14a2 2 0 0 0-1.083 1.082c-.152.367-.152.833-.152 1.765c0 .932 0 1.398.152 1.765a2 2 0 0 0 1.083 1.083c.367.152.833.152 1.765.152h2c.932 0 1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083c.152-.367.152-.833.152-1.765c0-.932 0-1.398-.152-1.765a2 2 0 0 0-1.083-1.083c-.204-.084-.438-.122-.765-.139"
        />
        <path d="M2 18.5c0 .932 0 1.398.152 1.765a2 2 0 0 0 1.083 1.083c.367.152.833.152 1.765.152h2c.932 0 1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083C10 19.898 10 19.432 10 18.5c0-.932 0-1.398-.152-1.765a2 2 0 0 0-1.083-1.083C8.398 15.5 7.932 15.5 7 15.5H5c-.932 0-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083C2 17.102 2 17.568 2 18.5Z" />
      </g>
    </svg>
  );
};

export const defaultTailwindCSS = "my-auto flex flex-shrink-0 text-default";
export const defaultTailwindCSSBlue = "my-auto flex flex-shrink-0 text-link";

export const PlugIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Plug size={size} className={className} />;
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
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 16 16"
    >
      <path
        fill="currentColor"
        d="M8 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6m4.735 6c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139z"
      />
    </svg>
  );
  // return <FiUser size={size} className={className} />;
};

export const NotebookIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555a.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533Zm1.5 16.103A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z"
      />
    </svg>
  );
};

export const GroupsIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiUsers size={size} className={className} />;
};

export const GearIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Gear size={size} className={className} />;
};

export const ArrowSquareOutIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <ArrowSquareOut size={size} className={className} />;
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
  className = defaultTailwindCSSBlue,
}: IconProps) => {
  return <FiGlobe size={size} className={className} />;
};

export const FileIcon = ({
  size = 16,
  className = defaultTailwindCSSBlue,
}: IconProps) => {
  return <FiFile size={size} className={className} />;
};

export const InfoIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiInfo size={size} className={className} />;
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

export const EditIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiEdit2 size={size} className={className} />;
};

export const XIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <X size={size} className={className} />;
};

export const ThumbsDownIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiThumbsDown size={size} className={className} />;
};

export const ChevronsUpIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiChevronsUp size={size} className={className} />;
};

export const ChevronsDownIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiChevronsDown size={size} className={className} />;
};

export const ChevronUpIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiChevronUp size={size} className={className} />;
};

export const ChevronDownIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiChevronDown size={size} className={className} />;
};

export const ChevronRightIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiChevronRight size={size} className={className} />;
};

export const ChevronLeftIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiChevronLeft size={size} className={className} />;
};

export const CheckmarkIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiCheck size={size} className={className} />;
};

export const AlertIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiAlertCircle size={size} className={className} />;
};

export const TriangleAlertIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiAlertTriangle size={size} className={className} />;
};

export const CopyIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiCopy size={size} className={className} />;
};

export const BookmarkIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 16 16"
    >
      <path
        fill="currentColor"
        d="M3.75 2a.75.75 0 0 0-.75.75v10.5a.75.75 0 0 0 1.28.53L8 10.06l3.72 3.72a.75.75 0 0 0 1.28-.53V2.75a.75.75 0 0 0-.75-.75z"
      />
    </svg>
  );

  // return <FiBookmark size={size} className={className} />;
};

export const ThumbsUpIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 20 20"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902c1.168.188 2.352.327 3.55.414c.28.02.521.18.642.413l1.713 3.293a.75.75 0 0 0 1.33 0l1.713-3.293a.783.783 0 0 1 .642-.413a41.102 41.102 0 0 0 3.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2ZM6.75 6a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 2.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z"
        clip-rule="evenodd"
      />
    </svg>
  );
};

export const CPUIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiCpu size={size} className={className} />;
};

export const RobotIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FaRobot size={size} className={className} />;
};

// export const ConnectorIcon = ({
//   size = 16,
//   className = defaultTailwindCSS,
// }: IconProps) => {
//   return <FiUploadCloud size={size} className={className} />;
// };

export const SettingsIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="m21.51 14.59l-1.25-1.32a7.878 7.878 0 0 0-.06-2.9l1.22-1.32a.76.76 0 0 0 .14-.79a10.257 10.257 0 0 0-2.2-3.35a.74.74 0 0 0-.72-.19l-1.84.47a8.48 8.48 0 0 0-1.83-1l-.45-1.72a.73.73 0 0 0-.59-.55a9.92 9.92 0 0 0-1.89-.17a9.36 9.36 0 0 0-2.35.31a.73.73 0 0 0-.53.53l-.48 1.77a8.23 8.23 0 0 0-1.52.88l-1.82-.45a.73.73 0 0 0-.72.21a10 10 0 0 0-2.23 3.62a.76.76 0 0 0 .16.77l1.26 1.31a8.85 8.85 0 0 0-.1 1.27c0 .3 0 .6.05.9l-1.31 1.46a.75.75 0 0 0-.16.73a10 10 0 0 0 2 3.59a.75.75 0 0 0 .76.24l1.72-.44a7.918 7.918 0 0 0 2 1.23l.5 1.79a.77.77 0 0 0 .56.53c.721.163 1.459.247 2.2.25c.59-.006 1.178-.063 1.76-.17a.75.75 0 0 0 .59-.53l.47-1.69a8.109 8.109 0 0 0 2.38-1.34l1.76.4a.74.74 0 0 0 .73-.24a10.118 10.118 0 0 0 2-3.34a.76.76 0 0 0-.21-.75m-9.39 1.27a3.81 3.81 0 1 1-.021-7.619a3.81 3.81 0 0 1 .02 7.62"
      />
    </svg>

    // <svg
    //   style={{ width: `${size}px`, height: `${size}px` }}
    //   className={`w-[${size}px] h-[${size}px] ` + className}

    //   xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24">
    //   <g fill="none" stroke="currentColor" stroke-width="1.5">
    //     <path stroke-linecap="round" stroke-linejoin="round" d="M2.75 8.917h18.5" />
    //     <rect width="18.5" height="18.5" x="2.75" y="2.75" rx="6" />
    //   </g>
    // </svg>
  );
};

export const ConnectorIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 16 16"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M4.5 13a3.5 3.5 0 0 1-1.41-6.705a3.5 3.5 0 0 1 6.63-2.171a2.5 2.5 0 0 1 3.197 3.018A3.001 3.001 0 0 1 12 13zm.72-5.03a.75.75 0 0 0 1.06 1.06l.97-.97v2.69a.75.75 0 0 0 1.5 0V8.06l.97.97a.75.75 0 1 0 1.06-1.06L8.53 5.72a.75.75 0 0 0-1.06 0z"
        clip-rule="evenodd"
      />
    </svg>
    // <svg
    //   style={{ width: `${size}px`, height: `${size}px` }}
    //   className={`w-[${size}px] h-[${size}px] ` + className}

    //   xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24">
    //   <g fill="none" stroke="currentColor" stroke-width="1.5">
    //     <path stroke-linecap="round" stroke-linejoin="round" d="M2.75 8.917h18.5" />
    //     <rect width="18.5" height="18.5" x="2.75" y="2.75" rx="6" />
    //   </g>
    // </svg>
  );
};

//
//  COMPANY LOGOS
//

export const LoopioIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] dark:invert ` + className}
    >
      <Image src="/Loopio.png" alt="Logo" width="96" height="96" />
    </div>
  );
};

export const NewIconTest = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 24 24"
    >
      <g fill="none" stroke="currentColor" stroke-width="1.5">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M2.75 8.917h18.5"
        />
        <rect width="18.5" height="18.5" x="2.75" y="2.75" rx="6" />
      </g>
    </svg>
  );
};

export const ShieldIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 16 16"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M8.5 1.709a.75.75 0 0 0-1 0a8.963 8.963 0 0 1-4.84 2.217a.75.75 0 0 0-.654.72a10.499 10.499 0 0 0 5.647 9.672a.75.75 0 0 0 .694-.001a10.499 10.499 0 0 0 5.647-9.672a.75.75 0 0 0-.654-.719A8.963 8.963 0 0 1 8.5 1.71m2.34 5.504a.75.75 0 0 0-1.18-.926L7.394 9.17l-1.156-.99a.75.75 0 1 0-.976 1.138l1.75 1.5a.75.75 0 0 0 1.078-.106z"
        clip-rule="evenodd"
      />
    </svg>
  );
};

export const PackageIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 20 20"
    >
      <g fill="currentColor">
        <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" />
        <path
          fill-rule="evenodd"
          d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5ZM7 11a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Z"
          clip-rule="evenodd"
        />
      </g>
    </svg>
  );
};

export const ToolIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M12 6.75a5.25 5.25 0 0 1 6.775-5.025a.75.75 0 0 1 .313 1.248l-3.32 3.319a2.248 2.248 0 0 0 1.941 1.939l3.318-3.319a.75.75 0 0 1 1.248.313a5.25 5.25 0 0 1-5.472 6.756c-1.018-.086-1.87.1-2.309.634L7.344 21.3A3.298 3.298 0 1 1 2.7 16.657l8.684-7.151c.533-.44.72-1.291.634-2.309A5.342 5.342 0 0 1 12 6.75ZM4.117 19.125a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008Z"
        clip-rule="evenodd"
      />
    </svg>
  );
};

export const ZoomInIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 20 20"
    >
      <g fill="currentColor">
        <path d="M8 10a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0Z" />
        <path
          fill-rule="evenodd"
          d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm5 5a3 3 0 1 0 1.524 5.585l1.196 1.195a.75.75 0 1 0 1.06-1.06l-1.195-1.196A3 3 0 0 0 9.5 7Z"
          clip-rule="evenodd"
        />
      </g>
    </svg>
  );
};

export const CpuIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 24 24"
    >
      <g fill="currentColor">
        <path d="M16.5 7.5h-9v9h9v-9Z" />
        <path
          fill-rule="evenodd"
          d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z"
          clip-rule="evenodd"
        />
      </g>
    </svg>
  );
};

export const SlackIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <svg
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        d="M16.923 16.52h-2.39a1.984 1.984 0 0 1-1.973-1.195a2.006 2.006 0 0 1 .47-2.263a1.99 1.99 0 0 1 1.502-.53h4.858a1.978 1.978 0 0 1 1.969 1.63a1.951 1.951 0 0 1-1.147 2.173a2.21 2.21 0 0 1-.876.174c-.8.022-1.601.01-2.413.01m-9.435.501v-2.477a2.003 2.003 0 0 1 .56-1.402a1.987 1.987 0 0 1 1.377-.608a1.942 1.942 0 0 1 1.393.522c.377.352.6.84.62 1.357c.043 1.738.043 3.477 0 5.215A1.94 1.94 0 0 1 10.805 21a1.922 1.922 0 0 1-1.423.495a1.954 1.954 0 0 1-1.359-.614a1.97 1.97 0 0 1-.535-1.395c-.01-.815 0-1.64 0-2.466m8.938-9.963v2.434a1.996 1.996 0 0 1-.524 1.5a1.98 1.98 0 0 1-2.242.469a1.981 1.981 0 0 1-1.078-1.165a1.996 1.996 0 0 1-.106-.804V4.46a1.963 1.963 0 0 1 .605-1.386a1.947 1.947 0 0 1 1.408-.537a1.962 1.962 0 0 1 1.383.602a1.979 1.979 0 0 1 .553 1.408c.011.836 0 1.673 0 2.51M6.97 11.511H4.545a1.962 1.962 0 0 1-1.393-.579a1.978 1.978 0 0 1-.427-2.155a1.978 1.978 0 0 1 1.066-1.07a1.97 1.97 0 0 1 .754-.15h4.923a1.962 1.962 0 0 1 1.392.579a1.98 1.98 0 0 1-1.392 3.375zm4.478-6.171v.902c0 .18-.06.261-.216.261H9.165A1.916 1.916 0 0 1 7.9 5.787a1.929 1.929 0 0 1-.4-1.402c.022-.492.227-.958.574-1.306a1.965 1.965 0 0 1 3.342 1.12c.032.38.032.487.032.832v.214zm-5.009 7.204c.06.813.06 1.63 0 2.444a1.902 1.902 0 0 1-.754 1.18a1.887 1.887 0 0 1-1.356.34a1.988 1.988 0 0 1-1.293-.627a2.003 2.003 0 0 1-.536-1.338a1.96 1.96 0 0 1 .497-1.346c.33-.369.786-.599 1.278-.643c.736-.065 1.471-.01 2.164-.01M17.443 11.5V9.329c.052-.509.299-.977.689-1.305c.39-.329.891-.492 1.399-.455c.522 0 1.023.208 1.392.579a1.981 1.981 0 0 1 0 2.796c-.37.371-.87.58-1.392.58c-.671 0-1.363-.022-2.088-.022m-4.967 6.072c.8-.055 1.603-.055 2.402 0c.488.09.92.367 1.208.773c.286.406.405.908.329 1.4a1.99 1.99 0 0 1-.67 1.264a1.98 1.98 0 0 1-1.343.485a1.922 1.922 0 0 1-1.314-.528a1.937 1.937 0 0 1-.6-1.287c-.044-.695-.012-1.401-.012-2.107"
      />
    </svg>
    // <div
    //   style={{ width: `${size}px`, height: `${size}px` }}
    //   className={`w-[${size}px] h-[${size}px] ` + className}
    // >
    //   <Image src="/Slack.png" alt="Logo" width="96" height="96" />
    // </div>
  );
};
export const GitlabIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src="/Gitlab.png" alt="Logo" width="96" height="96" />
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

export const GmailIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src="/Gmail.png" alt="Logo" width="96" height="96" />
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

export const OCIStorageIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={OCIStorageSVG} alt="Logo" width="96" height="96" />
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

export const GoogleStorageIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={googleCloudStorageIcon} alt="Logo" width="96" height="96" />
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

export const RequestTrackerIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={requestTrackerIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const SalesforceIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={salesforceIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const R2Icon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={r2Icon} alt="Logo" width="96" height="96" />
  </div>
);

export const S3Icon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={s3Icon} alt="Logo" width="96" height="96" />
  </div>
);

export const SharepointIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={sharepointIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const TeamsIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={teamsIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const GongIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={gongIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const HubSpotIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      // HubSpot Icon has a bit more surrounding whitespace than other icons, which is why we need to adjust it here
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={hubSpotIcon} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const Document360Icon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={document360Icon} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const GoogleSitesIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`w-[${size}px] h-[${size}px] ` + className}
    >
      <Image src={googleSitesIcon} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const ZendeskIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={zendeskIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const DropboxIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={dropboxIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const DiscourseIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={discourseIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const AxeroIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src="/Axero.jpeg" alt="Logo" width="96" height="96" />
  </div>
);

export const ClickupIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return (
    <div
      style={{ width: `${size + 4}px`, height: `${size + 4}px` }}
      className={`w-[${size + 4}px] h-[${size + 4}px] -m-0.5 ` + className}
    >
      <Image src={clickupIcon} alt="Logo" width="96" height="96" />
    </div>
  );
};

export const MediaWikiIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={mediawikiIcon} alt="Logo" width="96" height="96" />
  </div>
);

export const WikipediaIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`w-[${size}px] h-[${size}px] ` + className}
  >
    <Image src={wikipediaIcon} alt="Logo" width="96" height="96" />
  </div>
);

/* 
EE Icons
*/

export const BarChartIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiBarChart2 size={size} className={className} />;
};

export const DatabaseIcon = ({
  size = 16,
  className = defaultTailwindCSS,
}: IconProps) => {
  return <FiDatabase size={size} className={className} />;
};
