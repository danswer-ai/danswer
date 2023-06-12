import {
  FlowType,
  SearchDefaultOverrides,
  SearchResponse,
  SearchType,
} from "@/lib/search/interfaces";
import React from "react";
import { CheckCircle, Spinner } from "@phosphor-icons/react";

interface Props {
  isFetching: boolean;
  selectedSearchType: SearchType;
  searchResponse: SearchResponse | null;
  defaultOverrides: SearchDefaultOverrides;
}

export const SearchSteps: React.FC<Props> = ({
  isFetching,
  selectedSearchType,
  searchResponse,
  defaultOverrides,
}) => {
  if (
    !searchResponse ||
    !isFetching ||
    (searchResponse.suggestedFlowType === FlowType.SEARCH &&
      searchResponse.answer !== null)
  ) {
    return null;
  }

  const steps: [string, boolean][] = [];

  const searchIsComplete = searchResponse.answer !== null;
  if (selectedSearchType !== SearchType.AUTOMATIC) {
    steps.push(["Running semantic search...", searchIsComplete]);
  } else {
    steps.push(["Running automatic search...", searchIsComplete]);
  }

  if (
    searchResponse.answer &&
    (searchResponse.suggestedFlowType === FlowType.QUESTION_ANSWER ||
      defaultOverrides.forceDisplayQA)
  ) {
    steps.push(["Generating answer...", searchResponse.quotes !== null]);
  }

  return (
    <div className="flex flex-col text-sm text-gray-200">
      {steps.map(([message, isComplete], ind) => {
        return (
          <div key={ind} className="flex my-auto">
            <div className="mr-2">
              {isComplete ? (
                <CheckCircle className="text-emerald-600" />
              ) : (
                <Spinner />
              )}
            </div>
            {message}
          </div>
        );
      })}
    </div>
  );
};
