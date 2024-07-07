"use client";
import { SearchSection } from "@/components/search/SearchSection";
import FunctionalWrapper from "../chat/shared_chat_search/FunctionalWrapper";
import { CCPairBasicInfo, DocumentSet, Tag, User } from "@/lib/types";
import { Persona } from "../admin/assistants/interfaces";
import { ChatSession } from "../chat/interfaces";

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
  return (
    <FunctionalWrapper
      initiallyTogggled={toggleSearchSidebar}
      content={(toggle) => (
        <SearchSection
          toggle={toggle}
          toggleSearchSidebar={toggleSearchSidebar}
          querySessions={querySessions}
          user={user}
          ccPairs={ccPairs}
          documentSets={documentSets}
          personas={personas}
          tags={tags}
          defaultSearchType={searchTypeDefault}
        />
      )}
    />
  );
}
