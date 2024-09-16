import React, { useEffect, useState } from "react";

import {
  CustomTooltip,
  TooltipGroup,
} from "@/components/tooltip/CustomTooltip";
import { Modal } from "@/components/Modal";
import {
  DexpandTwoIcon,
  DownloadCSVIcon,
  ExpandTwoIcon,
  OpenIcon,
} from "@/components/icons/icons";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileDescriptor } from "@/app/chat/interfaces";

export default function CsvPage({
  csvFileDescriptor,
  close,
}: {
  csvFileDescriptor: FileDescriptor;
  close: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expand = () => {
    setExpanded((expanded) => !expanded);
  };

  return (
    <>
      {expanded ? (
        <Modal
          onOutsideClick={() => setExpanded(false)}
          className="!max-w-5xl rounded-2xl animate-all ease-in !p-0"
        >
          <CsvSection
            close={close}
            expanded={expanded}
            expand={expand}
            csvFileDescriptor={csvFileDescriptor}
          />
        </Modal>
      ) : (
        <CsvSection
          close={close}
          expanded={expanded}
          expand={expand}
          csvFileDescriptor={csvFileDescriptor}
        />
      )}
    </>
  );
}

export const CsvSection = ({
  expand,
  csvFileDescriptor,
  expanded,
  close,
}: {
  close: () => void;
  expanded: boolean;
  expand: () => void;
  csvFileDescriptor: FileDescriptor;
}) => {
  interface CSVData {
    [key: string]: string;
  }

  const [data, setData] = useState<CSVData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const fileId = csvFileDescriptor.id;
  useEffect(() => {
    fetchCSV(fileId);
  });

  const fetchCSV = async (id: string) => {
    try {
      const response = await fetch(`api/chat/file/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch CSV file");
      }
      const csvData = await response.text();
      const rows = csvData.trim().split("\n");
      const parsedHeaders = rows[0].split(",");
      setHeaders(parsedHeaders);

      const parsedData: CSVData[] = rows.slice(1).map((row) => {
        const values = row.split(",");
        return parsedHeaders.reduce<CSVData>((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {});
      });
      setData(parsedData);
    } catch (error) {
      console.error("Error fetching CSV file:", error);
    }
  };

  const downloadFile = () => {
    if (!fileId) return;

    const csvContent = [headers.join(",")]
      .concat(data.map((row) => headers.map((header) => row[header]).join(",")))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${csvFileDescriptor.name || "download"}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      className={`${!expanded ? "max-w-message-max" : "w-full"} !rounded !rounded-lg w-full border`}
    >
      <CardHeader className="w-full !py-0 !pb-4 border-b border-b-neutral-200 !pt-4 !mb-0 z-[10] top-0">
        <div className="flex justify-between items-center">
          <CardTitle className="!my-auto !text-xl">
            {csvFileDescriptor.name}
          </CardTitle>
          <div className="flex !my-auto">
            <TooltipGroup>
              <CustomTooltip
                showTick
                line
                position="top"
                content="Download file"
              >
                <button onClick={() => downloadFile()}>
                  <DownloadCSVIcon className="cursor-pointer transition-colors duration-300 hover:text-neutral-800 h-6 w-6 text-neutral-400" />
                </button>
              </CustomTooltip>
              <CustomTooltip
                line
                position="top"
                content={expanded ? "Minimize" : "Full screen"}
              >
                <button onClick={() => expand()}>
                  {!expanded ? (
                    <ExpandTwoIcon className="transition-colors duration-300 ml-4 hover:text-neutral-800 h-6 w-6 cursor-pointer text-neutral-400" />
                  ) : (
                    <DexpandTwoIcon className="transition-colors duration-300 ml-4 hover:text-neutral-800 h-6 w-6 cursor-pointer text-neutral-400" />
                  )}
                </button>
              </CustomTooltip>
              <CustomTooltip line position="top" content="No vis">
                <button onClick={() => close()}>
                  <OpenIcon className="transition-colors duration-300 ml-4 hover:text-neutral-800 h-6 w-6 cursor-pointer text-neutral-400" />
                </button>
              </CustomTooltip>
            </TooltipGroup>
          </div>
        </div>
      </CardHeader>
      <Card className="w-full max-h-[600px] !p-0 relative overflow-x-scroll overflow-y-scroll mx-auto">
        <CardContent className="!p-0">
          <Table>
            <TableHeader className="!sticky !top-0 ">
              <TableRow className="!bg-neutral-100">
                {headers.map((header, index) => (
                  <TableHead className=" !sticky !top-0 " key={index}>
                    {index == 0 ? "" : header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="max-h-[300px] overflow-y-auto">
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((header, cellIndex) => (
                    <TableCell
                      className={`${cellIndex == 0 && "sticky left-0 !bg-neutral-100"}`}
                      key={cellIndex}
                    >
                      {row[header]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
