import { useQueryHistory } from "../lib";
import { ThreeDotsLoader } from "@/components/Loading";
import { ChatSessionMinimal } from "../usage/types";
import { timestampToReadableDate } from "@/lib/dateUtils";
import { useState } from "react";
import { Feedback } from "@/lib/types";
import { DateRangeSelector } from "../DateRangeSelector";
import { PageSelector } from "@/components/PageSelector";
import Link from "next/link";
import { FeedbackBadge } from "./FeedbackBadge";
import { DownloadAsCSV } from "./DownloadAsCSV";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Frown, Minus, Smile } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const NUM_IN_PAGE = 20;

function QueryHistoryTableRow({
  chatSessionMinimal,
}: {
  chatSessionMinimal: ChatSessionMinimal;
}) {
  return (
    <TableRow
      key={chatSessionMinimal.id}
      className="hover:bg-hover-light cursor-pointer relative"
    >
      <TableCell>
        <p className="whitespace-normal line-clamp-5">
          {chatSessionMinimal.first_user_message || "-"}
        </p>
      </TableCell>
      <TableCell>
        <p className="whitespace-normal line-clamp-5">
          {chatSessionMinimal.first_ai_message || "-"}
        </p>
      </TableCell>
      <TableCell>
        <FeedbackBadge feedback={chatSessionMinimal.feedback_type} />
      </TableCell>
      <TableCell>{chatSessionMinimal.user_email || "-"}</TableCell>
      <TableCell>{chatSessionMinimal.assistant_name || "Unknown"}</TableCell>
      <TableCell>
        {timestampToReadableDate(chatSessionMinimal.time_created)}
      </TableCell>
      <td className="w-0 p-0">
        <Link
          href={`/admin/performance/query-history/${chatSessionMinimal.id}`}
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
      <p className="my-auto mr-2 font-medium mb-1">Feedback Type</p>
      <div className="max-w-sm space-y-6">
        <Select
          value={value}
          onValueChange={onValueChange as (value: string) => void}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <Minus size={16} className="inline mr-2" /> Any
            </SelectItem>
            <SelectItem value="like">
              <Smile size={16} className="inline mr-2" /> Like
            </SelectItem>
            <SelectItem value="dislike">
              <Frown size={16} className="inline mr-2" /> Dislike
            </SelectItem>
          </SelectContent>
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
    <>
      {chatSessionData ? (
        <div>
          <Card>
            <CardHeader className="border-b">
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
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First User Message</TableHead>
                    <TableHead>First AI Response</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Assistant</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chatSessionData
                    .slice(NUM_IN_PAGE * (page - 1), NUM_IN_PAGE * page)
                    .map((chatSessionMinimal) => (
                      <QueryHistoryTableRow
                        key={chatSessionMinimal.id}
                        chatSessionMinimal={chatSessionMinimal}
                      />
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="pt-6 flex">
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
        </div>
      ) : (
        <div className="h-80 flex flex-col">
          <ThreeDotsLoader />
        </div>
      )}
    </>
  );
}
