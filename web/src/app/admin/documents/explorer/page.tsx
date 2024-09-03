import { AdminPageTitle } from "@/components/admin/Title";
import { ZoomInIcon } from "@/components/icons/icons";
import { Explorer } from "./Explorer";
import { fetchValidFilterInfo } from "@/lib/search/utilsSS";
import { ZoomIn } from "lucide-react";

const Page = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) => {
  const { connectors, documentSets } = await fetchValidFilterInfo();

  return (
    <div className="container mx-auto py-24 md:py-32 lg:pt-16">
      <AdminPageTitle icon={<ZoomIn size={32} />} title="Document Explorer" />

      <Explorer
        initialSearchValue={searchParams.query}
        connectors={connectors}
        documentSets={documentSets}
      />
    </div>
  );
};

export default Page;
