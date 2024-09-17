"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { ClipboardIcon, EditIcon, TrashIcon } from "@/components/icons/icons";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { useStandardAnswers } from "./hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Button, Divider, Text } from "@tremor/react";
import Link from "next/link";
import { StandardAnswer } from "@/lib/types";
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
import { deleteStandardAnswer } from "./lib";
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
      <TableCell className="w-1/24">{entries[2]}</TableCell>
      <TableCell className="w-1/24">{entries[3]}</TableCell>
      <TableCell className="w-7/12 overflow-auto">{entries[4]}</TableCell>
      <TableCell className="w-1/24">{entries[5]}</TableCell>
    </TableRow>
  );
};

const StandardAnswersTableRow = ({
  standardAnswer,
  handleDelete,
}: {
  standardAnswer: StandardAnswer;
  handleDelete: (id: number) => void;
}) => {
  return (
    <RowTemplate
      id={standardAnswer.id}
      entries={[
        <Link
          key={`edit-${standardAnswer.id}`}
          href={`/admin/standard-answer/${standardAnswer.id}`}
        >
          <EditIcon />
        </Link>,
        <ReactMarkdown key={`keyword-${standardAnswer.id}`}>
          {standardAnswer.match_regex
            ? `\`${standardAnswer.keyword}\``
            : standardAnswer.keyword}
        </ReactMarkdown>,
        <CustomCheckbox
          key={`match_regex-${standardAnswer.id}`}
          checked={standardAnswer.match_regex}
        />,
        <ReactMarkdown key={`watch_mode-${standardAnswer.id}`}>
          {standardAnswer.apply_globally
            ? "All questions"
            : `${standardAnswer.personas.length} assistant(s)`}
        </ReactMarkdown>,
        <ReactMarkdown
          key={`answer-${standardAnswer.id}`}
          className="prose"
          remarkPlugins={[remarkGfm]}
        >
          {standardAnswer.answer}
        </ReactMarkdown>,
        <div
          key={`delete-${standardAnswer.id}`}
          className="cursor-pointer"
          onClick={() => handleDelete(standardAnswer.id)}
        >
          <TrashIcon />
        </div>,
      ]}
    />
  );
};

const StandardAnswersTable = ({
  standardAnswers,
  refresh,
  setPopup,
}: {
  standardAnswers: StandardAnswer[];
  refresh: () => void;
  setPopup: (popup: PopupSpec | null) => void;
}) => {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const columns = [
    { name: "", key: "edit" },
    { name: "Keywords/Pattern", key: "keyword" },
    { name: "Match regex?", key: "match_regex" },
    { name: "Watching", key: "apply_globally" },
    { name: "Answer", key: "answer" },
    { name: "", key: "delete" },
  ];

  const filteredStandardAnswers = standardAnswers.filter((standardAnswer) => {
    const {
      answer,
      id,
      match_regex,
      match_any_keywords,
      apply_globally,
      personas,
      ...fieldsToSearch
    } = standardAnswer;
    const cleanedQuery = query.toLowerCase();
    const searchMatch = Object.values(fieldsToSearch).some((value) => {
      return value.toLowerCase().includes(cleanedQuery);
    });
    return searchMatch;
  });

  const totalPages = Math.ceil(
    filteredStandardAnswers.length / NUM_RESULTS_PER_PAGE
  );
  const startIndex = (currentPage - 1) * NUM_RESULTS_PER_PAGE;
  const endIndex = startIndex + NUM_RESULTS_PER_PAGE;
  const paginatedStandardAnswers = filteredStandardAnswers.slice(
    startIndex,
    endIndex
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id: number) => {
    const response = await deleteStandardAnswer(id);
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
            {paginatedStandardAnswers.length > 0 ? (
              paginatedStandardAnswers.map((item) => (
                <StandardAnswersTableRow
                  key={item.id}
                  standardAnswer={item}
                  handleDelete={handleDelete}
                />
              ))
            ) : (
              <RowTemplate id={0} entries={["", "", "", "", "", ""]} />
            )}
          </TableBody>
        </Table>
        {paginatedStandardAnswers.length === 0 && (
          <div className="flex justify-center">
            <Text>No matching standard answers found...</Text>
          </div>
        )}
        {paginatedStandardAnswers.length > 0 && (
          <>
            <div className="mt-4">
              <Text>
                Ensure that you have added the Assistant to the relevant{" "}
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
    data: standardAnswers,
    error: standardAnswersError,
    isLoading: standardAnswersIsLoading,
    refreshStandardAnswers,
  } = useStandardAnswers();

  if (standardAnswersIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (standardAnswersError || !standardAnswers) {
    return (
      <ErrorCallout
        errorTitle="Error loading standard answers"
        errorMsg={
          standardAnswersError.info?.message ||
          standardAnswersError.message.info?.detail
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
      {standardAnswers.length == 0 && (
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
        <StandardAnswersTable
          standardAnswers={standardAnswers}
          refresh={refreshStandardAnswers}
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
