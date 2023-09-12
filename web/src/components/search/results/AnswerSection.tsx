import { Quote } from "@/lib/search/interfaces";
import { ResponseSection, StatusOptions } from "./ResponseSection";
import ReactMarkdown from "react-markdown";

interface AnswerSectionProps {
  answer: string | null;
  quotes: Quote[] | null;
  error: string | null;
  isAnswerable: boolean | null;
  isFetching: boolean;
  aiThoughtsIsOpen: boolean;
}

const AnswerHeader = ({
  answer,
  error,
  quotes,
  isAnswerable,
  isFetching,
}: AnswerSectionProps) => {
  if (error) {
    return <>Error while building answer</>;
  } else if ((answer && quotes !== null) || !isFetching) {
    if (isAnswerable === false) {
      return <>Best effort AI answer</>;
    }
    return <>AI answer</>;
  }
  if (isAnswerable === false) {
    return <>Building best effort AI answer...</>;
  }
  return <>Building answer...</>;
};

const AnswerBody = ({ answer, error, isFetching }: AnswerSectionProps) => {
  if (error) {
    return (
      <div className="flex">
        <div className="text-red-500 my-auto ml-1">{error}</div>
      </div>
    );
  } else if (answer) {
    return (
      <ReactMarkdown className="prose prose-invert text-gray-100 text-sm max-w-full">
        {answer.replaceAll("\\n", "\n")}
      </ReactMarkdown>
    );
  } else if (!isFetching) {
    return <div className="text-gray-300">Information not found</div>;
  }

  return null;
};

export const AnswerSection = (props: AnswerSectionProps) => {
  let status = "in-progress" as StatusOptions;
  if (props.error) {
    status = "failed";
  }
  // if AI thoughts is visible, don't mark this as a success until that section
  // is complete
  else if (!props.aiThoughtsIsOpen || props.isAnswerable !== null) {
    if (props.isAnswerable === false) {
      status = "warning";
    } else if ((props.quotes !== null && props.answer) || !props.isFetching) {
      status = "success";
    }
  }

  return (
    <ResponseSection
      status={status}
      header={
        <div className="flex">
          <div className="ml-2">{<AnswerHeader {...props} />}</div>
        </div>
      }
      body={
        <div className="">
          <AnswerBody {...props} />
        </div>
      }
      desiredOpenStatus={
        props.aiThoughtsIsOpen ? props.isAnswerable !== null : true
      }
      isNotControllable={true}
    />
  );
};
