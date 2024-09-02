import { useState } from "react";
import { PageSelector } from "@/components/PageSelector";
import { DocumentBoostStatus } from "@/lib/types";
import { updateHiddenStatus } from "../lib";
import { numToDisplay } from "./constants";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { getErrorMsg } from "@/lib/fetchUtils";
import { ScoreSection } from "../ScoreEditor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const IsVisibleSection = ({
  document,
  onUpdate,
}: {
  document: DocumentBoostStatus;
  onUpdate: (response: Response) => void;
}) => {
  return (
    <CustomTooltip
      trigger={
        document.hidden ? (
          <Badge
            onClick={async () => {
              const response = await updateHiddenStatus(
                document.document_id,
                false
              );
              onUpdate(response);
            }}
            variant="outline"
            className="py-1.5 px-3 gap-1.5 text-error"
          >
            Hidden
            <Checkbox checked={false} />
          </Badge>
        ) : (
          <Badge
            onClick={async () => {
              const response = await updateHiddenStatus(
                document.document_id,
                true
              );
              onUpdate(response);
            }}
            variant="outline"
            className="p-1.5 px-3 gap-1.5"
          >
            Visible
            <Checkbox checked={true} />
          </Badge>
        )
      }
    >
      <div className="text-xs">
        {document.hidden ? (
          <div className="flex">
            <FiEye className="my-auto mr-1" /> Unhide
          </div>
        ) : (
          <div className="flex">
            <FiEyeOff className="my-auto mr-1" />
            Hide
          </div>
        )}
      </div>
    </CustomTooltip>
  );
};

export const DocumentFeedbackTable = ({
  documents,
  refresh,
}: {
  documents: DocumentBoostStatus[];
  refresh: () => void;
}) => {
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  return (
    <div>
      <Card>
        <CardContent className="p-0">
          <Table className="overflow-visible">
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Is Searchable?</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents
                .slice((page - 1) * numToDisplay, page * numToDisplay)
                .map((document) => {
                  return (
                    <TableRow key={document.document_id}>
                      <TableCell className="whitespace-normal break-all">
                        <a
                          className="text-blue-600"
                          href={document.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {document.semantic_id}
                        </a>
                      </TableCell>
                      <TableCell>
                        <IsVisibleSection
                          document={document}
                          onUpdate={async (response) => {
                            if (response.ok) {
                              refresh();
                            } else {
                              toast({
                                title: "Error",
                                description: `Error updating hidden status - ${getErrorMsg(
                                  response
                                )}`,
                                variant: "destructive",
                              });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div key={document.document_id} className="w-fit">
                          <ScoreSection
                            documentId={document.document_id}
                            initialScore={document.boost}
                            refresh={refresh}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex pt-6">
        <div className="mx-auto">
          <PageSelector
            totalPages={Math.ceil(documents.length / numToDisplay)}
            currentPage={page}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>
    </div>
  );
};
