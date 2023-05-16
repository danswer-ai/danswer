"use client";

import { ValidSources } from "@/lib/types";
import {
  Globe,
  SlackLogo,
  GithubLogo,
  GoogleDriveLogo,
  Notebook,
} from "@phosphor-icons/react";

interface IconProps {
  size?: string;
  className?: string;
}

const defaultTailwindCSS = "text-blue-400 my-auto flex flex-shrink-0";

export const NotebookIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Notebook size={size} className={className} />;
};

export const GlobeIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <Globe size={size} className={className} />;
};

export const SlackIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <SlackLogo size={size} className={className} />;
};

export const GithubIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <GithubLogo size={size} className={className} />;
};

export const GoogleDriveIcon = ({
  size = "16",
  className = defaultTailwindCSS,
}: IconProps) => {
  return <GoogleDriveLogo size={size} className={className} />;
};
