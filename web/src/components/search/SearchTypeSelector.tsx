import { SearchType } from "@/lib/search/interfaces";

const defaultStyle =
  "py-1 px-2 border rounded border-emphasis dark:border-neutral-900 cursor-pointer font-bold ";

interface Props {
  selectedSearchType: SearchType;
  setSelectedSearchType: (searchType: SearchType) => void;
}

export const SearchTypeSelector: React.FC<Props> = ({
  selectedSearchType,
  setSelectedSearchType,
}) => {
  return (
    <div className="flex text-xs">
      <div
        className={
          defaultStyle +
          (selectedSearchType === SearchType.SEMANTIC
            ? "bg-blue-500"
            : "bg-gray-800 hover:bg-default dark:bg-neutral-500")
        }
        onClick={() => setSelectedSearchType(SearchType.SEMANTIC)}
      >
        AI Search
      </div>

      <div
        className={
          defaultStyle +
          "ml-2 " +
          (selectedSearchType === SearchType.KEYWORD
            ? "bg-blue-500"
            : "bg-gray-800 hover:bg-default dark:bg-neutral-500")
        }
        onClick={() => setSelectedSearchType(SearchType.KEYWORD)}
      >
        Keyword Search
      </div>
    </div>
  );
};
