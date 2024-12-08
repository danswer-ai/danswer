"use client";
import { useState } from "react";

import SignedUpUserTable from "@/components/admin/users/SignedUpUserTable";
import InviteUsersModal from "@/components/admin/users/InviteUsersModal";
import { SearchBar } from "@/components/search/SearchBar";
import { AdminPageTitle } from "@/components/admin/Title";
import { usePopup } from "@/components/admin/connectors/Popup";
import { UsersIcon } from "@/components/icons/icons";

import { useDebounce } from "@/hooks";

const Page = () => {
  const { popup, setPopup } = usePopup();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useDebounce(searchQuery, 300);

  return (
    <div className="mx-auto container">
      <AdminPageTitle title="Manage Users" icon={<UsersIcon size={32} />} />
      <div>
        {popup}
        <div className="flex flex-col gap-y-4">
          <div className="flex gap-x-4">
            <InviteUsersModal setPopup={setPopup} />
            <div className="flex-grow">
              <SearchBar
                query={searchQuery}
                setQuery={setSearchQuery}
                onSearch={() => setDebouncedQuery(searchQuery)}
              />
            </div>
          </div>
          <SignedUpUserTable q={debouncedQuery} setPopup={setPopup} />
        </div>
      </div>
    </div>
  );
};

export default Page;
