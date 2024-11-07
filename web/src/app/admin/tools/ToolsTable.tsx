"use client";

import { ToolSnapshot } from "@/lib/tools/interfaces";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { CustomTooltip } from "@/components/CustomTooltip";
import { useState } from "react";
import { DeleteModal } from "@/components/DeleteModal";

export function ToolsTable({
  tools,
  teamspaceId,
}: {
  tools: ToolSnapshot[];
  teamspaceId?: string | string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<ToolSnapshot | null>(null);

  const sortedTools = [...tools];
  sortedTools.sort((a, b) => a.id - b.id);

  return (
    <>
      {isDeleteModalOpen && toolToDelete && (
        <DeleteModal
          title="Are you sure you want to delete this tool?"
          description="This action will permanently schedule the selected tool for deletion. Please confirm if you want to proceed with this irreversible action."
          onClose={() => setIsDeleteModalOpen(false)}
          open={isDeleteModalOpen}
          onSuccess={async () => {
            const response = await deleteCustomTool(toolToDelete.id);
            if (response.data) {
              toast({
                title: "Tool Deleted",
                description: "The custom tool has been successfully deleted.",
                variant: "success",
              });
              setIsDeleteModalOpen(false);
              router.refresh();
            } else {
              toast({
                title: "Deletion Failed",
                description: `Unable to delete the tool: ${response.error}`,
                variant: "destructive",
              });
            }
          }}
        />
      )}
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
                        <CustomTooltip
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(
                                  teamspaceId
                                    ? `/t/${teamspaceId}/admin/tools/edit/${tool.id}?u=${Date.now()}`
                                    : `/admin/tools/edit/${tool.id}?u=${Date.now()}`
                                )
                              }
                            >
                              <Pencil size={16} />
                            </Button>
                          }
                          asChild
                        >
                          Edit
                        </CustomTooltip>
                      )}
                      <p className="text font-medium whitespace-normal break-none">
                        {tool.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal break-all min-w-80 max-w-2xl">
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
                        <CustomTooltip
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setToolToDelete(tool);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <TrashIcon />
                            </Button>
                          }
                          asChild
                          variant="destructive"
                        >
                          Delete
                        </CustomTooltip>
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
    </>
  );
}
