import { BackButton } from "@/components/BackButton";
import DocumentSetsCreationFormHOC from "@/components/adminPageComponents/documents/AdminDocumentsSetsCreationFormHOC";

export default function Page({
  params,
}: {
  params: { documentSetId: string };
}) {
  const documentSetId = parseInt(params.documentSetId);

  return (
    <div>
      <BackButton />
      <DocumentSetsCreationFormHOC documentSetId={documentSetId} />
    </div>
  );
}
