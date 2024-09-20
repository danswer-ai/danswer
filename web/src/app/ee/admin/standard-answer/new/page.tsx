import { AdminPageTitle } from "@/components/admin/Title";
import { StandaronyxCreationForm } from "@/app/ee/admin/standard-answer/StandaronyxCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { BackButton } from "@/components/BackButton";
import { Text } from "@tremor/react";
import { ClipboardIcon } from "@/components/icons/icons";
import { StandaronyxCategory } from "@/lib/types";

async function Page() {
  const standaronyxCategoriesResponse = await fetchSS(
    "/manage/admin/standard-answer/category"
  );

  if (!standaronyxCategoriesResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch standard answer categories - ${await standaronyxCategoriesResponse.text()}`}
      />
    );
  }
  const standaronyxCategories =
    (await standaronyxCategoriesResponse.json()) as StandaronyxCategory[];

  return (
    <div className="container mx-auto">
      <BackButton />
      <AdminPageTitle
        title="New Standard Answer"
        icon={<ClipboardIcon size={32} />}
      />

      <StandaronyxCreationForm standaronyxCategories={standaronyxCategories} />
    </div>
  );
}

export default Page;
