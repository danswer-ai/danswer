import { Quote } from "@/lib/search/interfaces";
import { ResponseSection, StatusOptions } from "./ResponseSection";
import { getSourceIcon } from "@/components/source";
import { CheckmarkIcon, CopyIcon } from "@/components/icons/icons";
import { useState } from "react";

const QuoteDisplay = ({ quoteInfo }: { quoteInfo: Quote }) => {
  const [detailIsOpen, setDetailIsOpen] = useState(false);
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setDetailIsOpen(true);
      }}
      onMouseLeave={() => setDetailIsOpen(false)}
    >
      {detailIsOpen && (
        <div className="absolute top-0 mt-9 pt-2 z-50">
          <div className="flex flex-shrink-0 rounded-lg w-96 shadow bg-gray-800 p-3 text-sm leading-relaxed text-gray-200">
            <div>
              <b>Quote:</b> <i>{quoteInfo.quote}</i>
            </div>
            <div
              className="my-auto pl-3 ml-auto"
              onClick={() => {
                navigator.clipboard.writeText(quoteInfo.quote);
                setCopyClicked(true);
                setTimeout(() => {
                  setCopyClicked(false);
                }, 1000);
              }}
            >
              {copyClicked ? (
                <CheckmarkIcon
                  className="my-auto flex flex-shrink-0 text-gray-500 hover:text-gray-400 cursor-pointer"
                  size={20}
                />
              ) : (
                <CopyIcon
                  className="my-auto flex flex-shrink-0 text-gray-500 hover:text-gray-400 cursor-pointer"
                  size={20}
                />
              )}
            </div>
          </div>
        </div>
      )}
      <button className="text-sm flex w-fit">
        <a
          className="flex max-w-[300px] shrink box-border p-2 border border-gray-800 rounded-lg hover:bg-gray-800"
          href={quoteInfo.link || undefined}
          target="_blank"
          rel="noopener noreferrer"
        >
          {getSourceIcon(quoteInfo.source_type, 20)}
          <p className="truncate break-all ml-2 mr-2">
            {quoteInfo.semantic_identifier || quoteInfo.document_id}
          </p>
        </a>

        {/* <div
          className="cursor-pointer h-full pt-2 pb-2 px-1 border-t border-b border-r border-gray-800 rounded-r-lg hover:bg-gray-800"
          onClick={() => setDetailIsOpen(!detailIsOpen)}
        >
          <div className="pt-0.5 mx-auto h-[20px]">
            <ZoomInIcon className="text-gray-500" size={14} />
          </div>
        </div> */}
      </button>
    </div>
  );
};

interface QuotesSectionProps {
  quotes: Quote[] | null;
  isAnswerable: boolean | null;
  isFetching: boolean;
}

const QuotesHeader = ({ quotes, isFetching }: QuotesSectionProps) => {
  if ((!quotes || quotes.length === 0) && isFetching) {
    return <>Extracting quotes...</>;
  }

  if (!quotes || quotes.length === 0) {
    return <>No quotes found</>;
  }

  return <>Quotes</>;
};

const QuotesBody = ({ quotes, isFetching }: QuotesSectionProps) => {
  if (!quotes && isFetching) {
    // height of quotes section to avoid extra "jumps" from the quotes loading
    return <div className="h-[42px]"></div>;
  }

  if (!isFetching && (!quotes || !quotes.length)) {
    return (
      <div className="flex">
        <div className="text-red-500 text-sm my-auto">
          Did not find any exact quotes to support the above answer.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {quotes!.map((quoteInfo) => (
        <QuoteDisplay quoteInfo={quoteInfo} key={quoteInfo.document_id} />
      ))}
    </div>
  );
};

export const QuotesSection = (props: QuotesSectionProps) => {
  let status: StatusOptions = "in-progress";
  if (!props.isFetching) {
    if (props.quotes && props.quotes.length > 0) {
      if (props.isAnswerable === false) {
        status = "warning";
      } else {
        status = "success";
      }
    } else {
      status = "failed";
    }
  }

  return (
    <ResponseSection
      status={status}
      header={<div className="ml-2">{<QuotesHeader {...props} />}</div>}
      body={<QuotesBody {...props} />}
      desiredOpenStatus={true}
      isNotControllable={true}
    />
  );
};
