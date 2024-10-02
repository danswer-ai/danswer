"use client";

import { CustomModal } from "@/components/CustomModal";
import { SearchInput } from "@/components/SearchInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Teamspace } from "@/lib/types";
import { Checkbox } from "@radix-ui/react-checkbox";
import { BookmarkIcon, Copy, Globe, Plus } from "lucide-react";
import { useState } from "react";

interface TeamspaceDataSourceProps {
  teamspace: Teamspace & { gradient: string };
}

export const TeamspaceDataSource = ({
  teamspace,
}: TeamspaceDataSourceProps) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCCPairs = teamspace.cc_pairs.filter((cc_pair) =>
    cc_pair.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <CustomModal
        trigger={
          <Button
            className="absolute top-4 right-4"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <Plus size={16} /> Add
          </Button>
        }
        title="Add new data source."
        description="Your invite link has been created. Share this link to join
            your workspace."
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      >
        Add
      </CustomModal>
      <CustomModal
        trigger={
          <div
            className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between"
            onClick={() => setIsDataSourceModalOpen(true)}
          >
            <h3>
              Data Source <span className="px-2 font-normal">|</span>{" "}
              {teamspace.cc_pairs.length}
            </h3>

            {teamspace.cc_pairs.length > 0 ? (
              <div className="pt-8 flex flex-wrap gap-2">
                {teamspace.cc_pairs.map((cc_pair) => {
                  return (
                    <Badge
                      key={cc_pair.id}
                      className="truncate whitespace-nowrap"
                    >
                      <BookmarkIcon size={16} className="shrink-0" />
                      <span className="truncate">{cc_pair.name}</span>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p>There are data source.</p>
            )}
          </div>
        }
        title="Data Sources"
        open={isDataSourceModalOpen}
        onClose={() => setIsDataSourceModalOpen(false)}
      >
        {teamspace.cc_pairs.length > 0 ? (
          <>
            <div className="w-1/2 ml-auto mb-4">
              <SearchInput
                placeholder="Search data source..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {filteredCCPairs.map((cc_pair) => (
                <div
                  key={cc_pair.id}
                  className="border rounded-md flex p-4 gap-4"
                >
                  <Globe className="shrink-0" />
                  <div className="w-full truncate">
                    <h3 className="truncate">{cc_pair.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          "There are no data source"
        )}
      </CustomModal>
    </div>
  );
};
