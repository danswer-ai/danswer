import { ReactNode } from "react";
import { CompactDocumentCard } from "../DocumentDisplay";
import { LoadedDanswerDocument } from "@/lib/search/interfaces";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// NOTE: This is the preivous version of the citations which works just fine
export function Citation({
  children,
  link,
  document,
  index,
}: {
  link?: string;
  children?: JSX.Element | string | null | ReactNode;
  index?: number;
  document: LoadedDanswerDocument;
}) {
  const innerText = children
    ? children?.toString().split("[")[1].split("]")[0]
    : index;

  // const CitationTrigger = () => {
  //   return (

  //   );
  // };

  if (link) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onMouseDown={() => window.open(link, "_blank")}
              className="inline-flex items-center ml-1 cursor-pointer transition-all duration-200 ease-in-out"
            >
              <span className="relative no-underline -top-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-full border border-gray-300 hover:bg-gray-200 hover:text-gray-900 shadow-sm no-underline">
                {innerText}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent width="w-f" className="bg-background">
            <CompactDocumentCard document={document} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  } else {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onMouseDown={() => window.open(link, "_blank")}
              className="inline-flex items-center ml-1 cursor-pointer transition-all duration-200 ease-in-out"
            >
              <span className="relative no-underline -top-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-full border border-gray-300 hover:bg-gray-200 hover:text-gray-900 shadow-sm no-underline">
                {innerText}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent width="max-w-lg" backgroundColor="bg-background-200">
            <CompactDocumentCard document={document} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
}
