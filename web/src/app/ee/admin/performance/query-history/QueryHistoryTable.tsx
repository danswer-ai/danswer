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
import { ChatSessionSnapshot } from "../usage/types";
import { timestampToReadableDate } from "@/lib/dateUtils";
import { FiFrown, FiMinus, FiSmile } from "react-icons/fi";
import { useState } from "react";
import { Feedback } from "@/lib/types";
import { DateRangeSelector } from "../DateRangeSelector";
import { PageSelector } from "@/components/PageSelector";
import Link from "next/link";
import { FeedbackBadge } from "./FeedbackBadge";
import { DownloadAsCSV } from "./DownloadAsCSV";

const NUM_IN_PAGE = 20;

function QueryHistoryTableRow({
  chatSessionSnapshot,
}: {
  chatSessionSnapshot: ChatSessionSnapshot;
}) {
  let finalFeedback: Feedback | "mixed" | null = null;
  for (const message of chatSessionSnapshot.messages) {
    if (message.feedback_type) {
      if (finalFeedback === null) {
        finalFeedback = message.feedback_type;
      } else if (finalFeedback !== message.feedback_type) {
        finalFeedback = "mixed";
      }
    }
  }

  return (
    <TableRow
      key={chatSessionSnapshot.id}
      className="hover:bg-hover-light cursor-pointer relative"
    >
      <TableCell>
        <Text className="whitespace-normal line-clamp-5">
          {chatSessionSnapshot.messages[0]?.message || "-"}
        </Text>
      </TableCell>
      <TableCell>
        <Text className="whitespace-normal line-clamp-5">
          {chatSessionSnapshot.messages[1]?.message || "-"}
        </Text>
      </TableCell>
      <TableCell>
        <FeedbackBadge feedback={finalFeedback} />
      </TableCell>
      <TableCell>{chatSessionSnapshot.user_email || "-"}</TableCell>
      <TableCell>{chatSessionSnapshot.persona_name || "Unknown"}</TableCell>
      <TableCell>
        {timestampToReadableDate(chatSessionSnapshot.time_created)}
      </TableCell>
      {/* Wrapping in <td> to avoid console warnings */}
      <td className="w-0 p-0">
        <Link
          href={`/admin/performance/query-history/${chatSessionSnapshot.id}`}
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
      <Text className="my-auto mr-2 font-medium mb-1">Feedback Type</Text>
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
    data: chatSessionData,
    selectedFeedbackType,
    setSelectedFeedbackType,
    timeRange,
    setTimeRange,
  } = useQueryHistory();

  const [page, setPage] = useState(1);

  return (
    <Card className="mt-8">
      {chatSessionData ? (
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
                <TableHeaderCell>First User Message</TableHeaderCell>
                <TableHeaderCell>First AI Response</TableHeaderCell>
                <TableHeaderCell>Feedback</TableHeaderCell>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Persona</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatSessionData
                .slice(NUM_IN_PAGE * (page - 1), NUM_IN_PAGE * page)
                .map((chatSessionSnapshot) => (
                  <QueryHistoryTableRow
                    key={chatSessionSnapshot.id}
                    chatSessionSnapshot={chatSessionSnapshot}
                  />
                ))}
            </TableBody>
          </Table>

          <div className="mt-3 flex">
            <div className="mx-auto">
              <PageSelector
                totalPages={Math.ceil(chatSessionData.length / NUM_IN_PAGE)}
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
