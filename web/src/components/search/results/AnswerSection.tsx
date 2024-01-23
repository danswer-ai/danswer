import { Quote } from "@/lib/search/interfaces";
import { ResponseSection, StatusOptions } from "./ResponseSection";
import ReactMarkdown from "react-markdown";

const TEMP_STRING = "__$%^TEMP$%^__";

function replaceNewlines(answer: string) {
  // Since the one-shot answer is a JSON, GPT adds extra backslashes to the
  // newlines. This function replaces the extra backslashes with the correct
  // number of backslashes so that ReactMarkdown can render the newlines

  // Step 1: Replace '\\\\n' with a temporary placeholder
  answer = answer.replace(/\\\\n/g, TEMP_STRING);

  // Step 2: Replace '\\n' with '\n'
  answer = answer.replace(/\\n/g, "\n");

  // Step 3: Replace the temporary placeholder with '\\n'
  answer = answer.replace(TEMP_STRING, "\\n");

  return answer;
}

interface AnswerSectionProps {
  answer: string | null;
  quotes: Quote[] | null;
  error: string | null;
  nonAnswerableReason: string | null;
  isFetching: boolean;
}

const AnswerHeader = ({
  answer,
  error,
  quotes,
  nonAnswerableReason,
  isFetching,
}: AnswerSectionProps) => {
  if (error) {
    return <>Error while building answer</>;
  } else if ((answer && quotes !== null) || !isFetching) {
    if (nonAnswerableReason) {
      return <>Best effort AI answer</>;
    }
    return <>AI answer</>;
  }
  if (nonAnswerableReason) {
    return <>Building best effort AI answer...</>;
  }
  return <>Building answer...</>;
};

const AnswerBody = ({ answer, error, isFetching }: AnswerSectionProps) => {
  if (error) {
    return (
      <div className="flex">
        <div className="text-error my-auto ml-1">{error}</div>
      </div>
    );
  } else if (answer) {
    return (
      <ReactMarkdown className="prose text-sm max-w-full">
        {replaceNewlines(answer)}
      </ReactMarkdown>
    );
  } else if (!isFetching) {
    return <div>Information not found</div>;
  }

  return null;
};

export const AnswerSection = (props: AnswerSectionProps) => {
  let status = "in-progress" as StatusOptions;
  if (props.error) {
    status = "failed";
  } else if (props.nonAnswerableReason) {
    status = "warning";
  } else if ((props.quotes !== null && props.answer) || !props.isFetching) {
    status = "success";
  }

  return (
    <ResponseSection
      status={status}
      header={
        <div className="flex">
          <div className="ml-2 text-strong">{<AnswerHeader {...props} />}</div>
        </div>
      }
      body={
        <div className="">
          <AnswerBody {...props} />
          {props.nonAnswerableReason && !props.isFetching && (
            <div className="mt-4 text-sm">
              <b className="font-medium">Warning:</b> the AI did not think this
              question was answerable.{" "}
              <div className="italic mt-1 ml-2">
                {props.nonAnswerableReason}
              </div>
            </div>
          )}
        </div>
      }
      desiredOpenStatus={true}
      isNotControllable={true}
    />
  );
};
