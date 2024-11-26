import React, { useState, useMemo, useEffect, useRef } from "react";
import { IndexAttemptStatus } from "@/components/Status";
import {
  ConnectorIndexingStatus,
  ConnectorSummary,
  GroupedConnectorSummaries,
  ValidSources,
} from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { SourceIcon } from "@/components/SourceIcon";
import { getSourceDisplayName } from "@/lib/sources";
import { Warning } from "@phosphor-icons/react";
import Cookies from "js-cookie";
import { TOGGLED_CONNECTORS_COOKIE_NAME } from "@/lib/constants";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { ConnectorCredentialPairStatus } from "../../connector/[ccPairId]/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Settings,
  Unlock,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CustomTooltip } from "@/components/CustomTooltip";
import FilterButton from "./FilterButton";

function SummaryRow({
  source,
  summary,
  isOpen,
  onToggle,
}: {
  source: ValidSources;
  summary: ConnectorSummary;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const activePercentage = (summary.active / summary.count) * 100;
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  return (
    <TableRow onClick={onToggle} className="bg-neutral-50">
      <TableCell className="gap-y-2">
        <div className="flex items-center text-xl font-semibold truncate ellipsis gap-x-2">
          <div className="cursor-pointer">
            {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
          <SourceIcon iconSize={20} sourceType={source} />
          {getSourceDisplayName(source)}
        </div>
      </TableCell>

      <TableCell className="gap-y-2 truncate">
        <div className="text-gray-500">Active Data Sources</div>
        <CustomTooltip
          trigger={
            <div className="flex items-center mt-1">
              <div className="w-full h-2 mr-2 bg-gray-200 rounded-full shrink-0">
                <Progress value={activePercentage} />
              </div>
              <span className="whitespace-nowrap">
                {summary.active} ({activePercentage.toFixed(0)}%)
              </span>
            </div>
          }
        >
          {summary.active} out of {summary.count} data sources are active
        </CustomTooltip>
      </TableCell>

      {isPaidEnterpriseFeaturesEnabled && (
        <TableCell className="gap-y-2">
          <div className="text-gray-500">Public Data Sources</div>
          <p className="flex items-center mx-auto mt-1 text-xl font-semibold">
            {summary.public}/{summary.count}
          </p>
        </TableCell>
      )}

      <TableCell className="gap-y-2">
        <div className="text-gray-500">Total Docs Indexed</div>
        <div className="text-xl font-semibold">
          {summary.totalDocsIndexed.toLocaleString()}
        </div>
      </TableCell>

      <TableCell className="gap-y-2">
        <div className="text-gray-500">Errors</div>

        <div className="flex items-center text-lg font-semibold gap-x-1">
          {summary.errors > 0 && <Warning className="w-6 h-6 text-error" />}
          {summary.errors}
        </div>
      </TableCell>
      <TableCell className="gap-y-2">
        <div className="text-gray-500">Total Data Sources</div>
        <div className="text-xl font-semibold">{summary.count}</div>
      </TableCell>
    </TableRow>
  );
}

function ConnectorRow({
  ccPairsIndexingStatus,
  invisible,
  isEditable,
}: {
  ccPairsIndexingStatus: ConnectorIndexingStatus<any, any>;
  invisible?: boolean;
  isEditable: boolean;
}) {
  const { teamspaceId } = useParams();
  const router = useRouter();
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  const handleManageClick = (e: any) => {
    e.stopPropagation();
    router.push(
      teamspaceId
        ? `/t/${teamspaceId}/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`
        : `/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`
    );
  };

  const getActivityBadge = () => {
    if (
      ccPairsIndexingStatus.cc_pair_status ===
      ConnectorCredentialPairStatus.DELETING
    ) {
      return (
        <Badge variant="deleting">
          <div className="w-3 h-3 shrink-0 rounded-full bg-destructive-500" />
          Deleting
        </Badge>
      );
    } else if (
      ccPairsIndexingStatus.cc_pair_status ===
      ConnectorCredentialPairStatus.PAUSED
    ) {
      return (
        <Badge variant="paused">
          <div className="w-3 h-3 shrink-0 bg-background rounded-full" />
          Paused
        </Badge>
      );
    }

    // ACTIVE case
    switch (ccPairsIndexingStatus.last_status) {
      case "in_progress":
        return (
          <Badge variant="indexing">
            <div className="w-3 h-3 shrink-0 rounded-full bg-background" />
            Indexing
          </Badge>
        );
      case "not_started":
        return (
          <Badge variant="scheduled">
            <div className="w-3 h-3 shrink-0 rounded-full bg-background" />
            Scheduled
          </Badge>
        );
      default:
        return (
          <Badge variant="active">
            <div className="w-3 h-3 shrink-0 rounded-full bg-background" />
            Active
          </Badge>
        );
    }
  };

  return (
    <TableRow
      className={`${invisible ? "invisible h-0 !-mb-10" : ""}`}
      onClick={() => {
        router.push(
          teamspaceId
            ? `/t/${teamspaceId}/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`
            : `/admin/connector/${ccPairsIndexingStatus.cc_pair_id}`
        );
      }}
    >
      <TableCell className="!w-[200px] xl:!w-[350px] !max-w-[480px] flex truncate">
        <CustomTooltip
          trigger={
            <p className=" truncate ellipsis w-auto">
              {ccPairsIndexingStatus.name}
            </p>
          }
          asChild
        >
          {ccPairsIndexingStatus.name}
        </CustomTooltip>
      </TableCell>
      {/* <TableCell>
        {timeAgo(ccPairsIndexingStatus?.last_success) || "-"}
      </TableCell> */}
      <TableCell>{getActivityBadge()}</TableCell>
      {isPaidEnterpriseFeaturesEnabled && (
        <TableCell>
          {ccPairsIndexingStatus.access_type === "public" ? (
            <Badge variant="secondary">
              <Unlock size={14} /> Public
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Lock size={14} /> Private
            </Badge>
          )}
        </TableCell>
      )}
      <TableCell>{ccPairsIndexingStatus.docs_indexed}</TableCell>
      <TableCell>
        <IndexAttemptStatus
          status={ccPairsIndexingStatus.last_status || null}
          errorMsg={
            ccPairsIndexingStatus?.latest_index_attempt?.error_msg || null
          }
        />
      </TableCell>
      <TableCell>
        {isEditable && (
          <CustomTooltip
            trigger={
              <Settings
                className="cursor-pointer"
                onClick={handleManageClick}
                size={16}
              />
            }
          >
            Manage Data Sources
          </CustomTooltip>
        )}
      </TableCell>
    </TableRow>
  );
}

export function CCPairIndexingStatusTable({
  ccPairsIndexingStatuses,
  editableCcPairsIndexingStatuses,
  teamspaceId,
}: {
  ccPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[];
  editableCcPairsIndexingStatuses: ConnectorIndexingStatus<any, any>[];
  teamspaceId?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();
  const [activityFilter, setActivityFilter] = useState<string | null>(null);
  const [permissionsFilter, setPermissionsFilter] = useState<string | null>(
    null
  );
  const [docsFilter, setDocsFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const [connectorsToggled, setConnectorsToggled] = useState<
    Record<ValidSources, boolean>
  >(() => {
    const savedState = Cookies.get(TOGGLED_CONNECTORS_COOKIE_NAME);
    return savedState ? JSON.parse(savedState) : {};
  });

  const { groupedStatuses, sortedSources, groupSummaries } = useMemo(() => {
    const grouped: Record<ValidSources, ConnectorIndexingStatus<any, any>[]> =
      {} as Record<ValidSources, ConnectorIndexingStatus<any, any>[]>;

    // First, add editable connectors
    editableCcPairsIndexingStatuses.forEach((status) => {
      const source = status.connector.source;
      if (!grouped[source]) {
        grouped[source] = [];
      }
      grouped[source].unshift(status);
    });

    // Then, add non-editable connectors
    ccPairsIndexingStatuses.forEach((status) => {
      const source = status.connector.source;
      if (!grouped[source]) {
        grouped[source] = [];
      }
      if (
        !editableCcPairsIndexingStatuses.some(
          (e) => e.cc_pair_id === status.cc_pair_id
        )
      ) {
        grouped[source].push(status);
      }
    });

    const sorted = Object.keys(grouped).sort() as ValidSources[];

    const summaries: GroupedConnectorSummaries =
      {} as GroupedConnectorSummaries;
    sorted.forEach((source) => {
      const statuses = grouped[source];
      summaries[source] = {
        count: statuses.length,
        active: statuses.filter(
          (status) =>
            status.cc_pair_status === ConnectorCredentialPairStatus.ACTIVE
        ).length,
        public: statuses.filter((status) => status.access_type === "public")
          .length,
        totalDocsIndexed: statuses.reduce(
          (sum, status) => sum + status.docs_indexed,
          0
        ),
        errors: statuses.filter((status) => status.last_status === "failed")
          .length,
      };
    });

    return {
      groupedStatuses: grouped,
      sortedSources: sorted,
      groupSummaries: summaries,
    };
  }, [ccPairsIndexingStatuses, editableCcPairsIndexingStatuses]);

  const toggleSource = (
    source: ValidSources,
    toggled: boolean | null = null
  ) => {
    const newConnectorsToggled = {
      ...connectorsToggled,
      [source]: toggled == null ? !connectorsToggled[source] : toggled,
    };
    setConnectorsToggled(newConnectorsToggled);
    Cookies.set(
      TOGGLED_CONNECTORS_COOKIE_NAME,
      JSON.stringify(newConnectorsToggled)
    );
  };
  const toggleSources = () => {
    const currentToggledCount =
      Object.values(connectorsToggled).filter(Boolean).length;
    const shouldToggleOn = currentToggledCount < sortedSources.length / 2;

    const connectors = sortedSources.reduce(
      (acc, source) => {
        acc[source] = shouldToggleOn;
        return acc;
      },
      {} as Record<ValidSources, boolean>
    );

    setConnectorsToggled(connectors);
    Cookies.set(TOGGLED_CONNECTORS_COOKIE_NAME, JSON.stringify(connectors));
  };
  const shouldExpand =
    Object.values(connectorsToggled).filter(Boolean).length <
    sortedSources.length / 2;

  const activityLabels: { [key: string]: string } = {
    Active: "Active",
    Pause: "Pause",
    Deleting: "Deleting",
    not_started: "Scheduled",
    in_progress: "Indexing",
  };

  const statusLabels: { [key: string]: string } = {
    success: "Success",
    in_progress: "Scheduled",
    not_started: "Not Started",
    failed: "Failed",
    completed_with_errors: "Completed with errors",
  };

  return (
    <div className="-mt-20">
      <div>
        <ConnectorRow
          invisible
          ccPairsIndexingStatus={{
            cc_pair_id: 1,
            name: "Sample File Connector",
            cc_pair_status: ConnectorCredentialPairStatus.ACTIVE,
            last_status: "success",
            connector: {
              name: "Sample File Data Source",
              source: "file",
              input_type: "poll",
              connector_specific_config: {
                file_locations: ["/path/to/sample/file.txt"],
              },
              refresh_freq: 86400,
              prune_freq: null,
              indexing_start: new Date("2023-07-01T12:00:00Z"),
              id: 1,
              credential_ids: [],
              time_created: "2023-07-01T12:00:00Z",
              time_updated: "2023-07-01T12:00:00Z",
            },
            credential: {
              id: 1,
              name: "Sample Credential",
              source: "file",
              user_id: "1",
              time_created: "2023-07-01T12:00:00Z",
              time_updated: "2023-07-01T12:00:00Z",
              credential_json: {},
              admin_public: false,
            },
            access_type: "public",
            docs_indexed: 1000,
            last_success: "2023-07-01T12:00:00Z",
            last_finished_status: "success",
            latest_index_attempt: null,
            owner: "1",
            error_msg: "",
            deletion_attempt: null,
            is_deletable: true,
            groups: [], // Add this line
          }}
          isEditable={false}
        />
        <div>
          <div className="w-full flex flex-col md:flex-row justify-between gap-2 mt-4">
            <div className="w-full md:w-1/2 flex items-center gap-x-2">
              <Input
                type="text"
                ref={searchInputRef}
                placeholder="Search data sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FilterButton
                setActivityFilter={setActivityFilter}
                setPermissionsFilter={setPermissionsFilter}
                setDocsFilter={setDocsFilter}
                setStatusFilter={setStatusFilter}
              />
            </div>
            <Button
              onClick={() => toggleSources()}
              className="md:w-[110px]"
              variant="outline"
            >
              {!shouldExpand ? "Collapse All" : "Expand All"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {activityFilter && (
            <Badge>
              {activityLabels[activityFilter] || activityFilter}
              <X
                size={14}
                className="cursor-pointer"
                onClick={() => setActivityFilter(null)}
              />
            </Badge>
          )}
          {permissionsFilter && (
            <Badge>
              {permissionsFilter}
              <X
                size={14}
                className="cursor-pointer"
                onClick={() => setPermissionsFilter(null)}
              />
            </Badge>
          )}
          {docsFilter !== null && (
            <Badge>
              {docsFilter}
              {docsFilter > 0 && "+"}
              <X
                size={14}
                className="cursor-pointer"
                onClick={() => setDocsFilter(null)}
              />
            </Badge>
          )}

          {statusFilter && (
            <Badge>
              {statusLabels[statusFilter] || statusFilter}
              <X
                size={14}
                className="cursor-pointer"
                onClick={() => setStatusFilter(null)}
              />
            </Badge>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="!w-[200px] xl:!w-[350px] flex items-center">
                  Name
                </TableHead>
                {/* <TableHead>
                  Last Indexed
                </TableHead> */}
                <TableHead>Activity</TableHead>
                {isPaidEnterpriseFeaturesEnabled && (
                  <TableHead>Permissions</TableHead>
                )}
                <TableHead>Total Docs</TableHead>
                <TableHead className="!w-[140px]">Last Status</TableHead>
                <TableHead className="!w-[160px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSources
                .filter(
                  (source) =>
                    source !== "not_applicable" && source !== "ingestion_api"
                )
                .map((source, ind) => {
                  const sourceMatches = source
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
                  const matchingConnectors = groupedStatuses[source].filter(
                    (status) => {
                      const nameMatches = (status.name || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase());

                      let matchesActivity = true;
                      let matchesPermissions = true;
                      let matchesDocs = true;
                      let matchesStatus = true;

                      if (activityFilter) {
                        const statusToMatch =
                          status.cc_pair_status.toLowerCase();

                        if (statusToMatch === "active") {
                          const lastStatusToMatch = status.last_status
                            ? status.last_status.toLowerCase()
                            : "";

                          switch (lastStatusToMatch) {
                            case "in_progress":
                              matchesActivity =
                                activityFilter.toLowerCase() === "in_progress";
                              break;
                            case "not_started":
                              matchesActivity =
                                activityFilter.toLowerCase() === "not_started";
                              break;
                            default:
                              matchesActivity =
                                activityFilter.toLowerCase() === "active";
                              break;
                          }
                        } else {
                          matchesActivity = statusToMatch.includes(
                            activityFilter.toLowerCase()
                          );
                        }
                      }

                      if (permissionsFilter) {
                        matchesPermissions = status.access_type
                          .toLowerCase()
                          .includes(permissionsFilter.toLowerCase());
                      }

                      if (docsFilter !== null) {
                        if (docsFilter === 0) {
                          matchesDocs = status.docs_indexed === 0;
                        } else {
                          matchesDocs = status.docs_indexed >= docsFilter;
                        }
                      }

                      if (statusFilter && status.last_status) {
                        matchesStatus = status.last_status
                          .toLowerCase()
                          .includes(statusFilter.toLowerCase());
                      }

                      return (
                        (sourceMatches || nameMatches) &&
                        matchesActivity &&
                        matchesPermissions &&
                        matchesDocs &&
                        matchesStatus
                      );
                    }
                  );
                  if (sourceMatches || matchingConnectors.length > 0) {
                    return (
                      <React.Fragment key={ind}>
                        {matchingConnectors.length > 0 && (
                          <SummaryRow
                            source={source}
                            summary={groupSummaries[source]}
                            isOpen={connectorsToggled[source] || false}
                            onToggle={() => toggleSource(source)}
                          />
                        )}

                        {connectorsToggled[source] && (
                          <>
                            {matchingConnectors.map((ccPairsIndexingStatus) => (
                              <ConnectorRow
                                key={ccPairsIndexingStatus.cc_pair_id}
                                ccPairsIndexingStatus={ccPairsIndexingStatus}
                                isEditable={editableCcPairsIndexingStatuses.some(
                                  (e) =>
                                    e.cc_pair_id ===
                                    ccPairsIndexingStatus.cc_pair_id
                                )}
                              />
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    );
                  }
                  return null;
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
