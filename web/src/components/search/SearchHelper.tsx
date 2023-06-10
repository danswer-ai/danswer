import { SearchResponse, SearchType } from "@/lib/search/interfaces";
import { BirdIcon } from "../icons/icons";

const getAssistantMessage = ({
  searchResponse,
  selectedSearchType,
}: Props) => {
  if (searchResponse?.answer) {
    return "HI!"
  }
  return null;
};

interface Props {
  searchResponse: SearchResponse | null;
  selectedSearchType: SearchType;
}

export const SearchHelper: React.FC<Props> = ({
  searchResponse,
  selectedSearchType,
}) => {
  const message = getAssistantMessage({ searchResponse, selectedSearchType });

  if (!message) {
    return null;
  }

  return (
    <div className="border border-gray-600 rounded p-4 w-64">
      <div className="flex">
        <BirdIcon size="20" />
        <b className="ml-2">AI Assistant</b>
      </div>

      <p className="text-sm">{message}</p>
    </div>
  );
};
