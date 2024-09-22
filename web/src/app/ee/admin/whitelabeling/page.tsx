import { WhitelabelingForm } from "./WhitelabelingForm";
import { AdminPageTitle } from "@/components/admin/Title";
import { Image as ImageIcon } from "lucide-react";

export default async function Whitelabeling() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          title="Whitelabeling"
          icon={<ImageIcon size={32} className="my-auto" />}
        />

        <WhitelabelingForm />
      </div>
    </div>
  );
}
