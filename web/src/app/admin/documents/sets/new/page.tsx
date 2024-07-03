import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import { BookmarkIcon } from "@/components/icons/icons";
import { BackButton } from "@/components/BackButton";
import DocumentsNewSetCreationFormHOC from "@/components/adminPageComponents/documents/AdminDocumentsNewSetCreationFormHOC";

const Page = () => {
  return (
    <div className="container mx-auto">
      <BackButton />

      <AdminPageTitle
        icon={<BookmarkIcon size={32} />}
        title="New Document Set"
      />

      <DocumentsNewSetCreationFormHOC />
    </div>
  );
};

export default Page;
