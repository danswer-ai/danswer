import { AdminPageTitle } from "@/components/admin/Title";
import { Bookmark } from "lucide-react";
import { Main } from "./Main";

const Page = () => {
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle icon={<Bookmark size={32} />} title="Document Sets" />

        <Main />
      </div>
    </div>
  );
};

export default Page;
