"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { ClosedBookIcon } from "@/components/icons/icons";
import { useAdminInputPrompts } from "./hooks";
import { PromptSection } from "./promptsection";

const Page = () => {
  const {
    data: promptLibrary,
    error: promptLibraryError,
    isLoading: promptLibraryIsLoading,
    refreshInputPrompts: refreshPrompts,
  } = useAdminInputPrompts();

  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ClosedBookIcon size={32} />}
        title="Prompt Library"
      />
      <PromptSection
        promptLibrary={promptLibrary || []}
        isLoading={promptLibraryIsLoading}
        error={promptLibraryError}
        refreshPrompts={refreshPrompts}
        isPublic={true}
      />
    </div>
  );
};
export default Page;
