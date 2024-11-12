"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { useAdminInputPrompts } from "./hooks";
import { PromptSection } from "./promptSection";
import { LibraryBigIcon } from "lucide-react";

const Page = () => {
  const {
    data: promptLibrary,
    error: promptLibraryError,
    isLoading: promptLibraryIsLoading,
    refreshInputPrompts: refreshPrompts,
  } = useAdminInputPrompts();

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container mx-auto">
        <AdminPageTitle
          icon={<LibraryBigIcon size={32} />}
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
    </div>
  );
};
export default Page;
