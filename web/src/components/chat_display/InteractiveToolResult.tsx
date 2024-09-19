import React, { useState, useEffect } from "react";
import {
  CustomTooltip,
  TooltipGroup,
} from "@/components/tooltip/CustomTooltip";
import {
  DexpandTwoIcon,
  DownloadCSVIcon,
  ExpandTwoIcon,
  OpenIcon,
} from "@/components/icons/icons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Modal } from "@/components/Modal";
import { FileDescriptor } from "@/app/chat/interfaces";
import { CsvContent, ToolDisplay } from "./CSVContent";

export default function ToolResult({
  csvFileDescriptor,
  close,
}: {
  csvFileDescriptor: FileDescriptor;
  close: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expand = () => setExpanded((prev) => !prev);

  return (
    <>
      {expanded && (
        <Modal
          hideCloseButton
          onOutsideClick={() => setExpanded(false)}
          className="!max-w-5xl overflow-hidden rounded-lg animate-all ease-in !p-0"
        >
          <FileWrapper
            fileDescriptor={csvFileDescriptor}
            close={close}
            expanded={true}
            expand={expand}
            ContentComponent={CsvContent}
          />
        </Modal>
      )}

      <FileWrapper
        fileDescriptor={csvFileDescriptor}
        close={close}
        expanded={false}
        expand={expand}
        ContentComponent={CsvContent}
      />
    </>
  );
}

interface FileWrapperProps {
  fileDescriptor: FileDescriptor;
  close: () => void;
  expanded: boolean;
  expand: () => void;
  ContentComponent: React.ComponentType<ToolDisplay>;
}

export const FileWrapper = ({
  fileDescriptor,
  close,
  expanded,
  expand,
  ContentComponent,
}: FileWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => setFadeIn(true), 50);
    } else {
      setFadeIn(false);
    }
  }, [isLoading]);

  const downloadFile = () => {
    // Implement download logic here
  };

  return (
    <div
      className={`${
        !expanded ? "w-message-sm" : "w-full"
      } !rounded !rounded-lg overflow-y-hidden w-full border border-border`}
    >
      <CardHeader className="w-full !py-0 !pb-4 border-b border-border border-b-neutral-200 !pt-4 !mb-0 z-[10] top-0">
        <div className="flex justify-between items-center">
          <CardTitle className="!my-auto text-ellipsis line-clamp-1 text-xl font-semibold text-text-700 pr-4 transition-colors duration-300">
            {fileDescriptor.name}
          </CardTitle>
          <div className="flex !my-auto">
            <TooltipGroup gap="gap-x-4">
              <CustomTooltip showTick line content="Download file">
                <button onClick={downloadFile}>
                  <DownloadCSVIcon className="cursor-pointer transition-colors duration-300 hover:text-text-800 h-6 w-6 text-text-400" />
                </button>
              </CustomTooltip>
              <CustomTooltip
                line
                showTick
                content={expanded ? "Minimize" : "Full screen"}
              >
                <button onClick={expand}>
                  {!expanded ? (
                    <ExpandTwoIcon className="transition-colors duration-300 hover:text-text-800 h-6 w-6 cursor-pointer text-text-400" />
                  ) : (
                    <DexpandTwoIcon className="transition-colors duration-300 hover:text-text-800 h-6 w-6 cursor-pointer text-text-400" />
                  )}
                </button>
              </CustomTooltip>
              <CustomTooltip showTick line content="Hide">
                <button onClick={close}>
                  <OpenIcon className="transition-colors duration-300 hover:text-text-800 h-6 w-6 cursor-pointer text-text-400" />
                </button>
              </CustomTooltip>
            </TooltipGroup>
          </div>
        </div>
      </CardHeader>
      <Card className="!rounded-none w-full max-h-[600px] !p-0 relative overflow-x-scroll overflow-y-scroll mx-auto">
        <CardContent className="!p-0">
          <ContentComponent
            fileDescriptor={fileDescriptor}
            isLoading={isLoading}
            fadeIn={fadeIn}
          />
        </CardContent>
      </Card>
    </div>
  );
};
