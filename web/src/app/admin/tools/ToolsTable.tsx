"use client";

import { ToolSnapshot } from "@/lib/tools/interfaces";
import { useRouter } from "next/navigation";
import { usePopup } from "@/components/admin/connectors/Popup";
import { FiEdit2 } from "react-icons/fi";
import { TrashIcon } from "@/components/icons/icons";
import { deleteCustomTool } from "@/lib/tools/edit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircleCheckBig, CircleX, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ToolsTable({ tools }: { tools: ToolSnapshot[] }) {
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  const sortedTools = [...tools];
  sortedTools.sort((a, b) => a.id - b.id);

  return (
    <div>
      {popup}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Built In?</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTools.map((tool) => (
                <TableRow key={tool.id.toString()}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tool.in_code_tool_id === null && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(
                              `/admin/tools/edit/${tool.id}?u=${Date.now()}`
                            )
                          }
                        >
                          <Pencil size={16} />
                        </Button>
                      )}
                      <p className="text font-medium whitespace-normal break-none">
                        {tool.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal break-all max-w-2xl">
                    {tool.description}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {tool.in_code_tool_id === null ? (
                      <Badge variant="secondary">
                        <CircleX size={14} />
                        No
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        <CircleCheckBig size={14} />
                        Yes
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex">
                      {tool.in_code_tool_id === null ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const response = await deleteCustomTool(tool.id);
                            if (response.data) {
                              router.refresh();
                            } else {
                              setPopup({
                                message: `Failed to delete tool - ${response.error}`,
                                type: "error",
                              });
                            }
                          }}
                        >
                          <TrashIcon />
                        </Button>
                      ) : (
                        "-"
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
