import { useQueryHistory } from "../lib";

import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
} from "@tremor/react";
import { Divider } from "@tremor/react";
import { Select, SelectItem } from "@tremor/react";
import { ThreeDotsLoader } from "@/components/Loading";
import { QuerySnapshot } from "../analytics/types";
import {
  timestampToDateString,
  timestampToReadableDate,
} from "@/lib/dateUtils";
import { FiBook, FiFrown, FiMinus, FiSmile } from "react-icons/fi";
import { useState } from "react";
import { Feedback } from "@/lib/types";
import { DateRangeSelector } from "../DateRangeSelector";
import { PageSelector } from "@/components/PageSelector";
import Link from "next/link";
import { FeedbackBadge } from "./FeedbackBadge";
import { DownloadAsCSV } from "./DownloadAsCSV";

const NUM_IN_PAGE = 20;

function QueryHistoryTableRow({
  querySnapshot,
}: {
  querySnapshot: QuerySnapshot;
}) {
  return (
    <TableRow
      key={querySnapshot.id}
      className="hover:bg-gradient-to-r hover:from-gray-800 hover:to-indigo-950 cursor-pointer relative"
    >
      <TableCell>{querySnapshot.query}</TableCell>
      <TableCell>
        <Text className="whitespace-normal line-clamp-5">
          {querySnapshot.llm_answer}
        </Text>
      </TableCell>
      <TableCell>
        {querySnapshot.retrieved_documents.slice(0, 5).map((document) => (
          <div className="flex" key={document.document_id}>
            <FiBook className="my-auto mr-1" />{" "}
            <p className="max-w-xs text-ellipsis overflow-hidden">
              {document.semantic_identifier}
            </p>
          </div>
        ))}
      </TableCell>
      <TableCell>
        <FeedbackBadge feedback={querySnapshot.feedback} />
      </TableCell>
      <TableCell>{querySnapshot.user_email || "-"}</TableCell>
      <TableCell>
        {timestampToReadableDate(querySnapshot.time_created)}
      </TableCell>
      {/* Wrapping in <td> to avoid console warnings */}
      <td className="w-0 p-0">
        <Link
          href={`/admin/performance/query-history/${querySnapshot.id}`}
          className="absolute w-full h-full left-0"
        ></Link>
      </td>
    </TableRow>
  );
}

function SelectFeedbackType({
  value,
  onValueChange,
}: {
  value: Feedback | "all";
  onValueChange: (value: Feedback | "all") => void;
}) {
  return (
    <div>
      <div className="text-sm my-auto mr-2 font-medium text-gray-200 mb-1">
        Feedback Type
      </div>
      <div className="max-w-sm space-y-6">
        <Select
          value={value}
          onValueChange={onValueChange as (value: string) => void}
          enableClear={false}
        >
          <SelectItem value="all" icon={FiMinus}>
            Any
          </SelectItem>
          <SelectItem value="like" icon={FiSmile}>
            Like
          </SelectItem>
          <SelectItem value="dislike" icon={FiFrown}>
            Dislike
          </SelectItem>
        </Select>
      </div>
    </div>
  );
}

export function QueryHistoryTable() {
  const {
    data: queryHistoryData,
    selectedFeedbackType,
    setSelectedFeedbackType,
    timeRange,
    setTimeRange,
  } = useQueryHistory();

  const [page, setPage] = useState(1);

  return (
    <Card className="mt-8">
      {queryHistoryData ? (
        <>
          <div className="flex">
            <div className="gap-y-3 flex flex-col">
              <SelectFeedbackType
                value={selectedFeedbackType || "all"}
                onValueChange={setSelectedFeedbackType}
              />

              <DateRangeSelector
                value={timeRange}
                onValueChange={setTimeRange}
              />
            </div>

            <DownloadAsCSV />
          </div>
          <Divider />
          <Table className="mt-5">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Query</TableHeaderCell>
                <TableHeaderCell>LLM Answer</TableHeaderCell>
                <TableHeaderCell>Retrieved Documents</TableHeaderCell>
                <TableHeaderCell>Feedback</TableHeaderCell>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queryHistoryData
                .slice(NUM_IN_PAGE * (page - 1), NUM_IN_PAGE * page)
                .map((querySnapshot) => (
                  <QueryHistoryTableRow
                    key={querySnapshot.id}
                    querySnapshot={querySnapshot}
                  />
                ))}
            </TableBody>
          </Table>

          <div className="mt-3 flex">
            <div className="mx-auto">
              <PageSelector
                totalPages={Math.ceil(queryHistoryData.length / NUM_IN_PAGE)}
                currentPage={page}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: "smooth",
                  });
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="h-80 flex flex-col">
          <ThreeDotsLoader />
        </div>
      )}
    </Card>
  );
}
