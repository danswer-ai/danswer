"use client";

import { useEffect, useState } from "react";
import { CustomModal } from "@/components/CustomModal";
import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { Globe, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConnectorIndexingStatus, Teamspace } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { CustomTooltip } from "@/components/CustomTooltip";

interface SimplifiedDataSource {
  id: number;
  name: string | null;
}

interface TeamspaceDataSourceProps {
  teamspace: Teamspace & { gradient: string };
  ccPairs: ConnectorIndexingStatus<any, any>[];
  refreshTeamspaces: () => void;
}

const DataSourceContent = ({
  searchTerm,
  setSearchTerm,
  filteredDataSources,
  isGlobal,
  onSelect,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredDataSources: SimplifiedDataSource[];
  isGlobal?: boolean;
  onSelect?: (dataSource: SimplifiedDataSource) => void;
}) => {
  return (
    <div className={isGlobal ? "cursor-pointer" : ""}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg leading-none tracking-tight lg:text-xl font-semibold">
          {isGlobal ? "Available" : "Current"} Data Source
        </h2>
        <div className="w-1/2">
          <SearchInput
            placeholder="Search data source..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>

      {filteredDataSources?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDataSources?.map((dataSource) => (
            <div
              key={dataSource.id}
              className="border rounded-md flex items-start gap-4 p-4 cursor-pointer"
              onClick={() => onSelect && onSelect(dataSource)}
            >
              <Globe className="shrink-0 my-auto" />
              <h3 className="truncate">{dataSource.name}</h3>
            </div>
          ))}
        </div>
      ) : (
        <p>There are no {isGlobal ? "Available" : "Current"} Data Sources.</p>
      )}
    </div>
  );
};

export const TeamspaceDataSource = ({
  teamspace,
  ccPairs,
  refreshTeamspaces,
}: TeamspaceDataSourceProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState(false);
  const [searchTermCurrent, setSearchTermCurrent] = useState("");
  const [searchTermGlobal, setSearchTermGlobal] = useState("");
  const [currentDataSources, setCurrentDataSources] = useState<
    SimplifiedDataSource[]
  >(teamspace.cc_pairs);

  useEffect(() => {
    setCurrentDataSources(teamspace.cc_pairs);
  }, [teamspace]);

  const [globalDataSources, setGlobalDataSources] = useState<
    SimplifiedDataSource[]
  >(() =>
    ccPairs
      .filter(
        (ccPair) =>
          ccPair.access_type === "public" &&
          !teamspace.cc_pairs.some(
            (currentCCPair) => currentCCPair.id === ccPair.cc_pair_id
          )
      )
      .map((ccPair) => ({ id: ccPair.cc_pair_id, name: ccPair.name }))
  );

  const [tempCurrentDataSources, setTempCurrentDataSources] =
    useState<SimplifiedDataSource[]>(currentDataSources);
  const [tempGlobalDataSources, setTempGlobalDataSources] =
    useState<SimplifiedDataSource[]>(globalDataSources);

  useEffect(() => {
    setTempCurrentDataSources(currentDataSources);
    const updatedGlobalDataSources = ccPairs
      .filter(
        (ccPair) =>
          ccPair.access_type === "public" &&
          !currentDataSources.some(
            (dataSource) => dataSource.id === ccPair.cc_pair_id
          )
      )
      .map((ccPair) => ({ id: ccPair.cc_pair_id, name: ccPair.name }));
    setGlobalDataSources(updatedGlobalDataSources);
    setTempGlobalDataSources(updatedGlobalDataSources);
  }, [currentDataSources, ccPairs]);

  const handleSelectDataSource = (ccPair: SimplifiedDataSource) => {
    if (
      tempCurrentDataSources.some((dataSource) => dataSource.id === ccPair.id)
    ) {
      setTempCurrentDataSources((prev) =>
        prev.filter((dataSource) => dataSource.id !== ccPair.id)
      );
      setTempGlobalDataSources((prev) => [...prev, ccPair]);
    } else {
      setTempCurrentDataSources((prev) => [...prev, ccPair]);
      setTempGlobalDataSources((prev) =>
        prev.filter((dataSource) => dataSource.id !== ccPair.id)
      );
    }
  };

  const handleSaveChanges = async () => {
    try {
      const response = await fetch(
        `/api/manage/admin/teamspace/${teamspace.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_ids: teamspace.users.map((user) => user.id),
            assistant_ids: teamspace.assistants.map(
              (assistant) => assistant.id
            ),
            document_set_ids: teamspace.document_sets.map(
              (docSet) => docSet.id
            ),
            cc_pair_ids: tempCurrentDataSources.map(
              (dataSource) => dataSource.id
            ),
          }),
        }
      );

      const responseJson = await response.json();

      if (!response.ok) {
        toast({
          title: "Update Failed",
          description: `Unable to update data source: ${responseJson.detail || "Unknown error."}`,
          variant: "destructive",
        });
        return;
      }

      setCurrentDataSources(tempCurrentDataSources);
      setGlobalDataSources(tempGlobalDataSources);
      router.refresh();
      toast({
        title: "Data Source Updated",
        description:
          "Data Source have been successfully updated in the teamspace.",
        variant: "success",
      });
      refreshTeamspaces();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "An error occurred while updating data source.",
        variant: "destructive",
      });
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsDataSourceModalOpen(false);
    setTempCurrentDataSources(currentDataSources);
    setTempGlobalDataSources(globalDataSources);
  };

  return (
    <CustomModal
      trigger={
        <div
          className={`rounded-md bg-background-subtle w-full p-4 min-h-36 flex flex-col justify-between ${teamspace.is_up_to_date && !teamspace.is_up_for_deletion && "cursor-pointer"}`}
          onClick={() =>
            setIsDataSourceModalOpen(
              teamspace.is_up_to_date && !teamspace.is_up_for_deletion
                ? true
                : false
            )
          }
        >
          <div className="flex items-center justify-between">
            <h3>
              Data Source <span className="px-2 font-normal">|</span>
              {teamspace.cc_pairs.length}
            </h3>
            {teamspace.is_up_to_date && !teamspace.is_up_for_deletion && (
              <Pencil size={16} />
            )}
          </div>
          {teamspace.cc_pairs.length > 0 ? (
            <div className="pt-8 flex flex-wrap gap-2">
              {teamspace.cc_pairs.slice(0, 8).map((teamspaceDataSource) => (
                <CustomTooltip
                  variant="white"
                  key={teamspaceDataSource.id}
                  trigger={
                    <Badge key={teamspaceDataSource.id}>
                      <div className="truncate">{teamspaceDataSource.name}</div>
                    </Badge>
                  }
                >
                  {teamspaceDataSource.name}
                </CustomTooltip>
              ))}
              {teamspace.cc_pairs.length > 8 && (
                <div className="bg-background w-10 h-full rounded-full flex items-center justify-center text-sm font-semibold">
                  +{teamspace.cc_pairs.length - 8}
                </div>
              )}
            </div>
          ) : (
            <p>There are no data source.</p>
          )}
        </div>
      }
      title="Data Source"
      open={isDataSourceModalOpen}
      onClose={handleCloseModal}
    >
      <div className="space-y-12">
        <DataSourceContent
          searchTerm={searchTermCurrent}
          setSearchTerm={setSearchTermCurrent}
          filteredDataSources={tempCurrentDataSources.filter((dataSource) =>
            dataSource.name
              ?.toLowerCase()
              .includes(searchTermCurrent.toLowerCase())
          )}
          isGlobal={false}
          onSelect={handleSelectDataSource}
        />
        <DataSourceContent
          searchTerm={searchTermGlobal}
          setSearchTerm={setSearchTermGlobal}
          filteredDataSources={tempGlobalDataSources.filter((dataSource) =>
            dataSource.name
              ?.toLowerCase()
              .includes(searchTermGlobal.toLowerCase())
          )}
          isGlobal={true}
          onSelect={handleSelectDataSource}
        />
      </div>

      <div className="flex justify-end mt-10 gap-2">
        <Button onClick={handleCloseModal} variant="ghost">
          Cancel
        </Button>
        <Button onClick={handleSaveChanges}>Save changes</Button>
      </div>
    </CustomModal>
  );
};
