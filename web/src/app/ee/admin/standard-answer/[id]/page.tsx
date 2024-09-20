import { AdminPageTitle } from "@/components/admin/Title";
import { StandaronyxCreationForm } from "@/app/ee/admin/standard-answer/StandaronyxCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { BackButton } from "@/components/BackButton";
import { Text } from "@tremor/react";
import { ClipboardIcon } from "@/components/icons/icons";
import { Standaronyx, StandaronyxCategory } from "@/lib/types";

async function Page({ params }: { params: { id: string } }) {
  const tasks = [
    fetchSS("/manage/admin/standard-answer"),
    fetchSS(`/manage/admin/standard-answer/category`),
  ];
  const [standaronyxsResponse, standaronyxCategoriesResponse] =
    await Promise.all(tasks);
  if (!standaronyxsResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch standard answers - ${await standaronyxsResponse.text()}`}
      />
    );
  }
  const allStandaronyxs = (await standaronyxsResponse.json()) as Standaronyx[];
  const standaronyx = allStandaronyxs.find(
    (answer) => answer.id.toString() === params.id
  );

  if (!standaronyx) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Did not find standard answer with ID: ${params.id}`}
      />
    );
  }

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
        title="Edit Standard Answer"
        icon={<ClipboardIcon size={32} />}
      />

      <StandaronyxCreationForm
        standaronyxCategories={standaronyxCategories}
        existingStandaronyx={standaronyx}
      />
    </div>
  );
}

export default Page;
