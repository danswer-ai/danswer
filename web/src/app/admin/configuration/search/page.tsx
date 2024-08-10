"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { SearchIcon } from "@/components/icons/icons";
import { SearchConfiguration } from "./SearchConfiguration";
const Page = () => {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Search Setup"
        icon={<SearchIcon size={32} className="my-auto" />}
      />

      <SearchConfiguration />
    </div>
  );
};

export default Page;
