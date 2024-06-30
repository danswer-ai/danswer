import { ThumbsUpIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import DocumentsFeedbackTablesHOC from "@/components/adminPageComponents/documents/AdminDocumentsFeedbackTablesHOC";


const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ThumbsUpIcon size={32} />}
        title="Document Feedback"
      />

      <DocumentsFeedbackTablesHOC />
    </div>
  );
};

export default Page;
