import { Quote } from "@/lib/search/interfaces";
import { ResponseSection, StatusOptions } from "./ResponseSection";
import { CheckmarkIcon, CopyIcon } from "@/components/icons/icons";
import { useState } from "react";
import { SourceIcon } from "@/components/SourceIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomTooltip } from "@/components/CustomTooltip";

const QuoteDisplay = ({ quoteInfo }: { quoteInfo: Quote }) => {
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <CustomTooltip
      trigger={
        <div className="text-sm flex w-full">
          <a
            href={quoteInfo.link || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit"
          >
            <Button variant="outline" className="w-full max-w-[750px]">
              <SourceIcon sourceType={quoteInfo.source_type} iconSize={16} />
              <p className="truncate break-all ml-2 mr-2">
                {quoteInfo.semantic_identifier || quoteInfo.document_id}
              </p>
            </Button>
          </a>
        </div>
      }
    >
      <div className="flex items-center gap-2 max-w-96">
        <div>
          <b>Quote:</b> <i>{quoteInfo.quote}</i>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(quoteInfo.quote);
            setCopyClicked(true);
            setTimeout(() => {
              setCopyClicked(false);
            }, 1000);
          }}
        >
          {copyClicked ? <CheckmarkIcon size={16} /> : <CopyIcon size={16} />}
        </Button>
      </div>
    </CustomTooltip>
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
        <div className="text-error text-sm my-auto">
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
      header={<div className="ml-2 ">{<QuotesHeader {...props} />}</div>}
      body={<QuotesBody {...props} />}
      desiredOpenStatus={true}
      isNotControllable={true}
    />
  );
};
