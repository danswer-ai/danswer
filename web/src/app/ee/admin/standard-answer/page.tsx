"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { ClipboardIcon, EditIcon, TrashIcon } from "@/components/icons/icons";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { useStandaronyxs, useStandaronyxCategories } from "./hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Button, Divider, Text } from "@tremor/react";
import Link from "next/link";
import { Standaronyx, StandaronyxCategory } from "@/lib/types";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { deleteStandaronyx } from "./lib";
import { FilterDropdown } from "@/components/search/filtering/FilterDropdown";
import { FiTag } from "react-icons/fi";
import { SelectedBubble } from "@/components/search/filtering/Filters";
import { PageSelector } from "@/components/PageSelector";
import { CustomCheckbox } from "@/components/CustomCheckbox";

const NUM_RESULTS_PER_PAGE = 10;

type Displayable = JSX.Element | string;

const RowTemplate = ({
  id,
  entries,
}: {
  id: number;
  entries: [
    Displayable,
    Displayable,
    Displayable,
    Displayable,
    Displayable,
    Displayable,
  ];
}) => {
  return (
    <TableRow key={id}>
      <TableCell className="w-1/24">{entries[0]}</TableCell>
      <TableCell className="w-2/12">{entries[1]}</TableCell>
      <TableCell className="w-2/12">{entries[2]}</TableCell>
      <TableCell className="w-1/24">{entries[3]}</TableCell>
      <TableCell className="w-7/12 overflow-auto">{entries[4]}</TableCell>
      <TableCell className="w-1/24">{entries[5]}</TableCell>
    </TableRow>
  );
};

const CategoryBubble = ({
  name,
  onDelete,
}: {
  name: string;
  onDelete?: () => void;
}) => (
  <span
    className={`
      inline-block
      px-2
      py-1
      mr-1
      mb-1
      text-xs
      font-semibold
      text-emphasis
      bg-hover
      rounded-full
      items-center
      w-fit
      ${onDelete ? "cursor-pointer" : ""}
    `}
    onClick={onDelete}
  >
    {name}
    {onDelete && (
      <button
        className="ml-1 text-subtle hover:text-emphasis"
        aria-label="Remove category"
      >
        &times;
      </button>
    )}
  </span>
);

const StandaronyxsTableRow = ({
  standaronyx,
  handleDelete,
}: {
  standaronyx: Standaronyx;
  handleDelete: (id: number) => void;
}) => {
  return (
    <RowTemplate
      id={standaronyx.id}
      entries={[
        <Link
          key={`edit-${standaronyx.id}`}
          href={`/admin/standard-answer/${standaronyx.id}`}
        >
          <EditIcon />
        </Link>,
        <div key={`categories-${standaronyx.id}`}>
          {standaronyx.categories.map((category) => (
            <CategoryBubble key={category.id} name={category.name} />
          ))}
        </div>,
        <ReactMarkdown key={`keyword-${standaronyx.id}`}>
          {standaronyx.match_regex
            ? `\`${standaronyx.keyword}\``
            : standaronyx.keyword}
        </ReactMarkdown>,
        <CustomCheckbox
          key={`match_regex-${standaronyx.id}`}
          checked={standaronyx.match_regex}
        />,
        <ReactMarkdown
          key={`answer-${standaronyx.id}`}
          className="prose"
          remarkPlugins={[remarkGfm]}
        >
          {standaronyx.answer}
        </ReactMarkdown>,
        <div
          key={`delete-${standaronyx.id}`}
          className="cursor-pointer"
          onClick={() => handleDelete(standaronyx.id)}
        >
          <TrashIcon />
        </div>,
      ]}
    />
  );
};

const StandaronyxsTable = ({
  standaronyxs,
  standaronyxCategories,
  refresh,
  setPopup,
}: {
  standaronyxs: Standaronyx[];
  standaronyxCategories: StandaronyxCategory[];
  refresh: () => void;
  setPopup: (popup: PopupSpec | null) => void;
}) => {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<
    StandaronyxCategory[]
  >([]);
  const columns = [
    { name: "", key: "edit" },
    { name: "Categories", key: "category" },
    { name: "Keywords/Pattern", key: "keyword" },
    { name: "Match regex?", key: "match_regex" },
    { name: "Answer", key: "answer" },
    { name: "", key: "delete" },
  ];

  const filteredStandaronyxs = standaronyxs.filter((standaronyx) => {
    const {
      answer,
      id,
      categories,
      match_regex,
      match_any_keywords,
      ...fieldsToSearch
    } = standaronyx;
    const cleanedQuery = query.toLowerCase();
    const searchMatch = Object.values(fieldsToSearch).some((value) => {
      return value.toLowerCase().includes(cleanedQuery);
    });
    const categoryMatch =
      selectedCategories.length == 0 ||
      selectedCategories.some((category) =>
        categories.map((c) => c.id).includes(category.id)
      );
    return searchMatch && categoryMatch;
  });

  const totalPages = Math.ceil(
    filteredStandaronyxs.length / NUM_RESULTS_PER_PAGE
  );
  const startIndex = (currentPage - 1) * NUM_RESULTS_PER_PAGE;
  const endIndex = startIndex + NUM_RESULTS_PER_PAGE;
  const paginatedStandaronyxs = filteredStandaronyxs.slice(
    startIndex,
    endIndex
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id: number) => {
    const response = await deleteStandaronyx(id);
    if (response.ok) {
      setPopup({
        message: `Standard answer ${id} deleted`,
        type: "success",
      });
    } else {
      const errorMsg = await response.text();
      setPopup({
        message: `Failed to delete standard answer - ${errorMsg}`,
        type: "error",
      });
    }
    refresh();
  };

  const handleCategorySelect = (category: StandaronyxCategory) => {
    setSelectedCategories((prev: StandaronyxCategory[]) => {
      const prevCategoryIds = prev.map((category) => category.id);
      if (prevCategoryIds.includes(category.id)) {
        return prev.filter((c) => c.id !== category.id);
      }
      return [...prev, category];
    });
  };

  return (
    <div className="justify-center py-2">
      <div className="flex items-center w-full border-2 border-border rounded-lg px-4 py-2 focus-within:border-accent">
        <MagnifyingGlass />
        <textarea
          autoFocus
          className="flex-grow ml-2 h-6 bg-transparent outline-none placeholder-subtle overflow-hidden whitespace-normal resize-none"
          role="textarea"
          aria-multiline
          placeholder="Find standard answers by keyword/phrase..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCurrentPage(1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          suppressContentEditableWarning={true}
        />
      </div>
      <div className="my-4 border-b border-border">
        <FilterDropdown
          options={standaronyxCategories.map((category) => {
            return {
              key: category.name,
              display: category.name,
            };
          })}
          selected={selectedCategories.map((category) => category.name)}
          handleSelect={(option) => {
            handleCategorySelect(
              standaronyxCategories.find(
                (category) => category.name === option.key
              )!
            );
          }}
          icon={
            <div className="my-auto mr-2 w-[16px] h-[16px]">
              <FiTag size={16} />
            </div>
          }
          defaultDisplay="All Categories"
        />
        <div className="flex flex-wrap pb-4 mt-3">
          {selectedCategories.map((category) => (
            <CategoryBubble
              key={category.id}
              name={category.name}
              onDelete={() => handleCategorySelect(category)}
            />
          ))}
        </div>
      </div>
      <div className="mx-auto">
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableHeaderCell key={column.key}>
                  {column.name}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedStandaronyxs.length > 0 ? (
              paginatedStandaronyxs.map((item) => (
                <StandaronyxsTableRow
                  key={item.id}
                  standaronyx={item}
                  handleDelete={handleDelete}
                />
              ))
            ) : (
              <RowTemplate id={0} entries={["", "", "", "", "", ""]} />
            )}
          </TableBody>
        </Table>
        {paginatedStandaronyxs.length === 0 && (
          <div className="flex justify-center">
            <Text>No matching standard answers found...</Text>
          </div>
        )}
        {paginatedStandaronyxs.length > 0 && (
          <>
            <div className="mt-4">
              <Text>
                Ensure that you have added the category to the relevant{" "}
                <a className="text-link" href="/admin/bot">
                  Slack bot
                </a>
                .
              </Text>
            </div>
            <div className="mt-4 flex justify-center">
              <PageSelector
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                shouldScroll={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Main = () => {
  const { popup, setPopup } = usePopup();
  const {
    data: standaronyxs,
    error: standaronyxsError,
    isLoading: standaronyxsIsLoading,
    refreshStandaronyxs,
  } = useStandaronyxs();
  const {
    data: standaronyxCategories,
    error: standaronyxCategoriesError,
    isLoading: standaronyxCategoriesIsLoading,
  } = useStandaronyxCategories();

  if (standaronyxsIsLoading || standaronyxCategoriesIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (standaronyxsError || !standaronyxs) {
    return (
      <ErrorCallout
        errorTitle="Error loading standard answers"
        errorMsg={
          standaronyxsError.info?.message ||
          standaronyxsError.message.info?.detail
        }
      />
    );
  }

  if (standaronyxCategoriesError || !standaronyxCategories) {
    return (
      <ErrorCallout
        errorTitle="Error loading standard answer categories"
        errorMsg={
          standaronyxCategoriesError.info?.message ||
          standaronyxCategoriesError.message.info?.detail
        }
      />
    );
  }

  return (
    <div className="mb-8">
      {popup}

      <Text className="mb-2">
        Manage the standard answers for pre-defined questions.
        <br />
        Note: Currently, only questions asked from Slack can receive standard
        answers.
      </Text>
      {standaronyxs.length == 0 && (
        <Text className="mb-2">Add your first standard answer below!</Text>
      )}
      <div className="mb-2"></div>

      <Link className="flex mb-3 mt-2 w-fit" href="/admin/standard-answer/new">
        <Button className="my-auto" color="green" size="xs">
          New Standard Answer
        </Button>
      </Link>

      <Divider />

      <div>
        <StandaronyxsTable
          standaronyxs={standaronyxs}
          standaronyxCategories={standaronyxCategories}
          refresh={refreshStandaronyxs}
          setPopup={setPopup}
        />
      </div>
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ClipboardIcon size={32} />}
        title="Standard Answers"
      />
      <Main />
    </div>
  );
};

export default Page;
