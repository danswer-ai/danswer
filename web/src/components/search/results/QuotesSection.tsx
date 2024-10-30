import { Quote } from "@/lib/search/interfaces";
import { ResponseSection, StatusOptions } from "./ResponseSection";
import { CheckmarkIcon, CopyIcon } from "@/components/icons/icons";
import { useState } from "react";
import { SourceIcon } from "@/components/SourceIcon";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";

const QuoteDisplay = ({ quoteInfo }: { quoteInfo: Quote }) => {
  const [detailIsOpen, setDetailIsOpen] = useState(false);
  const [isCopyClicked, setIsCopyClicked] = useState(false);

  return (
    <CustomTooltip
      trigger={
        <div className="text-sm flex">
          <Button variant="outline" className="max-w-full" asChild>
            <a
              href={quoteInfo.link || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-full"
            >
              <SourceIcon sourceType={quoteInfo.source_type} iconSize={18} />
              <p className="truncate max-w-full break-all ml-2 mr-2">
                {quoteInfo.semantic_identifier || quoteInfo.document_id}
              </p>
            </a>
          </Button>
        </div>
      }
      variant="white"
    >
      <div className="text-sm flex gap-2 items-center">
        <div>
          <b>Quote:</b>{" "}
          <i>
            {quoteInfo.quote} Quote: React lets you build user interfaces out of
            individual pieces called components.
          </i>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(quoteInfo.quote);
            setIsCopyClicked(true);
            setTimeout(() => {
              setIsCopyClicked(false);
            }, 1000);
          }}
        >
          {isCopyClicked ? (
            <CheckmarkIcon className="my-auto flex flex-shrink-0" size={16} />
          ) : (
            <CopyIcon className="my-auto flex flex-shrink-0" size={16} />
          )}
        </Button>
      </div>
    </CustomTooltip>
  );
};

interface QuotesSectionProps {
  quotes: Quote[] | null;
  isFetching: boolean;
}

const QuotesHeader = ({ quotes, isFetching }: QuotesSectionProps) => {
  if ((!quotes || quotes.length === 0) && isFetching) {
    return <>Extracting quotes...</>;
  }

  return <>Quotes</>;
};

const QuotesBody = ({ quotes, isFetching }: QuotesSectionProps) => {
  if (!quotes && isFetching) {
    // height of quotes section to avoid extra "jumps" from the quotes loading
    return <div className="h-[42px]"></div>;
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
      status = "success";
    } else {
      status = "failed";
    }
  }

  return (
    <ResponseSection
      status={status}
      header={<div>{<QuotesHeader {...props} />}</div>}
      body={<QuotesBody {...props} />}
      desiredOpenStatus={true}
      isNotControllable={true}
    />
  );
};
