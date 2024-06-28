"use client";
import { SearchSection } from "@/components/search/SearchSection";
import { Header } from "@/components/header/Header";
import { CCPairBasicInfo, DocumentSet, Tag, User } from "@/lib/types";
import { SearchType } from "@/lib/search/interfaces";
import { Persona } from "../admin/assistants/interfaces";

import { useState } from "react";

import { AdminSidebar } from "@/components/admin/connectors/AdminSidebar";
import {
  NotebookIcon,
  UsersIcon,
  ThumbsUpIcon,
  BookmarkIcon,
  ZoomInIcon,
  RobotIcon,
  ConnectorIcon,
} from "@/components/icons/icons";

import { FiCpu, FiPackage, FiSettings, FiSlack, FiTool } from "react-icons/fi";

export default function ClientHome({
  user,
  ccPairs,
  documentSets,
  personas,
  tags,
  searchTypeDefault,
}: {
  user: User | null;
  ccPairs: CCPairBasicInfo[];
  documentSets: DocumentSet[];
  personas: Persona[];
  tags: Tag[];
  searchTypeDefault: SearchType;
}) {
  // Disable caching so we always get the up to date connector / document set / persona info
  // importantly, this prevents users from adding a connector, going back to the main page,
  // and then getting hit with a "No Connectors" popup

  const [isOpenAdminSidebar, setIsOpenAdminSidebar] = useState(false);
  const toggleAdminSidebar = () => {
    setIsOpenAdminSidebar((isOpenAdminSidebar) => !isOpenAdminSidebar);
  };

  return (
    <>
      <Header
        hideToggle={isOpenAdminSidebar}
        toggleSidebar={toggleAdminSidebar}
        user={user}
      />

      <AdminSidebar
        isOpen={isOpenAdminSidebar}
        toggleAdminSidebar={toggleAdminSidebar}
        hideonDesktop={true}
      />

      <div className="desktop:px-24 pt-4 desktop:pt-10 flex flex-col items-center min-h-screen">
        <div className="w-full">
          <SearchSection
            ccPairs={ccPairs}
            documentSets={documentSets}
            personas={personas}
            tags={tags}
            defaultSearchType={searchTypeDefault}
          />
        </div>
      </div>
    </>
  );
}
