
import { NotebookIcon } from "@/components/icons/icons";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import Link from "next/link";
import { Button } from "@tremor/react";
import StatusViewer from "@/components/adminPageComponents/indexing/AdminIndexingStatusViewer";

export default function Status() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        icon={<NotebookIcon size={32} />}
        title="Existing Connectors"
        farRightElement={
          <Link href="/admin/add-connector">
            <Button color="green" size="xs">
              Add Connector
            </Button>
          </Link>
        }
      />
      <StatusViewer />
    </div>
  );
}
