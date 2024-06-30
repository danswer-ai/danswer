import { SlackBotConfig } from "@/lib/types";
import { useState } from "react";
import { PopupSpec } from "@/components/adminPageComponents/connectors/Popup";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tremor/react";
import Link from "next/link";
import { PageSelector } from "@/components/PageSelector";
import {
  EditIcon,
  TrashIcon,
} from "@/components/icons/icons";
import {
  FiArrowUpRight,
} from "react-icons/fi";

import { deleteSlackBotConfig, isPersonaASlackBotPersona} from "@/lib/bot/helpers";

export default function SlackBotConfigsTable ({
    slackBotConfigs,
    refresh,
    setPopup,
  }: {
    slackBotConfigs: SlackBotConfig[];
    refresh: () => void;
    setPopup: (popupSpec: PopupSpec | null) => void;
  }) {
    const numToDisplay = 50;
    const [page, setPage] = useState(1);
  
    // sort by name for consistent ordering
    slackBotConfigs.sort((a, b) => {
      if (a.id < b.id) {
        return -1;
      } else if (a.id > b.id) {
        return 1;
      } else {
        return 0;
      }
    });
  
    return (
      <div>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Channels</TableHeaderCell>
              <TableHeaderCell>Persona</TableHeaderCell>
              <TableHeaderCell>Document Sets</TableHeaderCell>
              <TableHeaderCell>Delete</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slackBotConfigs
              .slice(numToDisplay * (page - 1), numToDisplay * page)
              .map((slackBotConfig) => {
                return (
                  <TableRow key={slackBotConfig.id}>
                    <TableCell>
                      <div className="flex gap-x-2">
                        <Link
                          className="cursor-pointer my-auto"
                          href={`/admin/bot/${slackBotConfig.id}`}
                        >
                          <EditIcon />
                        </Link>
                        <div className="my-auto">
                          {slackBotConfig.channel_config.channel_names
                            .map((channel_name) => `#${channel_name}`)
                            .join(", ")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {slackBotConfig.persona &&
                      !isPersonaASlackBotPersona(slackBotConfig.persona) ? (
                        <Link
                          href={`/admin/assistants/${slackBotConfig.persona.id}`}
                          className="text-blue-500 flex"
                        >
                          <FiArrowUpRight className="my-auto mr-1" />
                          {slackBotConfig.persona.name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {" "}
                      <div>
                        {slackBotConfig.persona &&
                        slackBotConfig.persona.document_sets.length > 0
                          ? slackBotConfig.persona.document_sets
                              .map((documentSet) => documentSet.name)
                              .join(", ")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {" "}
                      <div
                        className="cursor-pointer"
                        onClick={async () => {
                          const response = await deleteSlackBotConfig(
                            slackBotConfig.id
                          );
                          if (response.ok) {
                            setPopup({
                              message: `Slack bot config "${slackBotConfig.id}" deleted`,
                              type: "success",
                            });
                          } else {
                            const errorMsg = await response.text();
                            setPopup({
                              message: `Failed to delete Slack bot config - ${errorMsg}`,
                              type: "error",
                            });
                          }
                          refresh();
                        }}
                      >
                        <TrashIcon />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
  
        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(slackBotConfigs.length / numToDisplay)}
              currentPage={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      </div>
    );
  };