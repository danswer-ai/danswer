import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import { ZoomInIcon } from "@/components/icons/icons";
import { Explorer } from "@/components/adminPageComponents/documents/AdminDocumentsExplorerExplorer";
import { fetchValidFilterInfo } from "@/lib/search/utilsSS";

const Page = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) => {
  const { connectors, documentSets } = await fetchValidFilterInfo();

  return (
    <div className="mx-auto container">
      <AdminPageTitle
        icon={<ZoomInIcon size={32} />}
        title="Document Explorer"
      />

      <Explorer
        initialSearchValue={searchParams.query}
        connectors={connectors}
        documentSets={documentSets}
      />
    </div>
  );
};

export default Page;
