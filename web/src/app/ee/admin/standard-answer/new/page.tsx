import { AdminPageTitle } from "@/components/admin/Title";
import { StandardAnswerCreationForm } from "@/app/ee/admin/standard-answer/StandardAnswerCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { BackButton } from "@/components/BackButton";
import { Text } from "@tremor/react";
import { ClipboardIcon } from "@/components/icons/icons";

async function Page() {
  return (
    <div className="container mx-auto">
      <BackButton />
      <AdminPageTitle
        title="New Standard Answer"
        icon={<ClipboardIcon size={32} />}
      />

      <StandardAnswerCreationForm />
    </div>
  );
}

export default Page;
