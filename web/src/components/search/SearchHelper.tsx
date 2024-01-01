import {
  FlowType,
  SearchDefaultOverrides,
  SearchRequestOverrides,
  SearchResponse,
  SearchType,
} from "@/lib/search/interfaces";
import { BrainIcon } from "../icons/icons";

const CLICKABLE_CLASS_NAME = "text-link cursor-pointer";
const NUM_DOCUMENTS_FED_TO_GPT = 5;

interface Props {
  isFetching: boolean;
  searchResponse: SearchResponse | null;
  selectedSearchType: SearchType;
  setSelectedSearchType: (searchType: SearchType) => void;
  defaultOverrides: SearchDefaultOverrides;
  restartSearch: (overrides?: SearchRequestOverrides) => void;
  forceQADisplay: () => void;
  setOffset: (offset: number) => void;
}

const getAssistantMessage = ({
  isFetching,
  searchResponse,
  selectedSearchType,
  setSelectedSearchType,
  defaultOverrides,
  restartSearch,
  forceQADisplay,
  setOffset,
}: Props): string | JSX.Element | null => {
  if (!searchResponse || !searchResponse.suggestedFlowType) {
    return null;
  }

  if (
    searchResponse.suggestedFlowType === FlowType.SEARCH &&
    !defaultOverrides.forceDisplayQA &&
    searchResponse.answer
  ) {
    return (
      <div>
        This doesn&apos;t seem like a question for a Generative AI. Do you still
        want to have{" "}
        <span className={CLICKABLE_CLASS_NAME} onClick={forceQADisplay}>
          GPT give a response?
        </span>
      </div>
    );
  }

  if (
    (searchResponse.suggestedFlowType === FlowType.QUESTION_ANSWER ||
      defaultOverrides.forceDisplayQA) &&
    !isFetching &&
    searchResponse.answer === ""
  ) {
    return (
      <div>
        GPT was unable to find an answer in the most relevant{" "}
        <b>{` ${(defaultOverrides.offset + 1) * NUM_DOCUMENTS_FED_TO_GPT} `}</b>{" "}
        documents. Do you want to{" "}
        <span
          className={CLICKABLE_CLASS_NAME}
          onClick={() => {
            const newOffset = defaultOverrides.offset + 1;
            setOffset(newOffset);
            restartSearch({
              offset: newOffset,
            });
          }}
        >
          keep searching?
        </span>
      </div>
    );
  }

  return null;
};

export const SearchHelper: React.FC<Props> = (props) => {
  const message = getAssistantMessage(props);

  if (!message) {
    return null;
  }

  return (
    <div className="border border-border rounded p-3 text-sm">
      <div className="flex">
        <BrainIcon size={20} />
        <b className="ml-2 text-strong">AI Assistant</b>
      </div>

      <div className="mt-1">{message}</div>
    </div>
  );
};
