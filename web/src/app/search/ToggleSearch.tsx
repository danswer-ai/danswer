"use client";
import { SearchSection } from "@/components/search/SearchSection";
import FunctionalWrapper from "../chat/shared_chat_search/FunctionalWrapper";
import { CCPairBasicInfo, DocumentSet, Tag, User } from "@/lib/types";
import { Persona } from "../admin/assistants/interfaces";
import { ChatSession } from "../chat/interfaces";
import { useState } from "react";

export default function ToggleSearch({
  toggleSearchSidebar,
  querySessions,
  ccPairs,
  documentSets,
  personas,
  searchTypeDefault,
  tags,
  user,
}: {
  toggleSearchSidebar: boolean;
  querySessions: ChatSession[];
  ccPairs: CCPairBasicInfo[];
  documentSets: DocumentSet[];
  personas: Persona[];
  searchTypeDefault: string;
  tags: Tag[];
  user: User | null;
}) {
  const [toggledSidebar, setToggledSidebar] = useState<boolean>(
    toggleSearchSidebar || false
  );
  const toggle = () => {
    setToggledSidebar((toggledSidebar) => !toggledSidebar);
  };

  return (
    <FunctionalWrapper toggledSidebar={toggledSidebar}>
      <SearchSection
        toggle={toggle}
        toggledSidebar={toggledSidebar}
        querySessions={querySessions}
        user={user}
        ccPairs={ccPairs}
        documentSets={documentSets}
        personas={personas}
        tags={tags}
        defaultSearchType={searchTypeDefault}
      />
    </FunctionalWrapper>
  );
}
