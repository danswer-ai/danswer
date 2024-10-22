"use client";

import { Bold, Text, Title } from "@tremor/react";
import { ChatSessionSnapshot, MessageSnapshot } from "../../usage/types";
import { timestampToReadableDate } from "@/lib/dateUtils";
import { BackButton } from "@/components/BackButton";
import { FeedbackBadge } from "../FeedbackBadge";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR from "swr";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ThreeDotsLoader } from "@/components/Loading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book } from "lucide-react";

function MessageDisplay({ message }: { message: MessageSnapshot }) {
  return (
    <div className="pb-6">
      <h3>{message.message_type === "user" ? "User" : "AI"}</h3>
      <p className="text-sm pt-1">{message.message}</p>
      {message.documents.length > 0 && (
        <div className="flex flex-col gap-y-2 pt-6">
          <h3>Reference Documents</h3>
          <div className="flex gap-2 flex-wrap">
            {message.documents.slice(0, 5).map((document) => {
              return (
                <Badge
                  variant="outline"
                  key={document.document_id}
                  className="cursor-pointer hover:bg-opacity-80"
                >
                  <Book
                    size={12}
                    className={
                      "shrink-0" + (document.link ? " text-link" : " ")
                    }
                  />
                  {document.link ? (
                    <a
                      href={document.link}
                      target="_blank"
                      className="text-link truncate"
                    >
                      {document.semantic_identifier}
                    </a>
                  ) : (
                    document.semantic_identifier
                  )}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
      {message.feedback_type && (
        <div className="mt-6 space-y-2">
          <h3>Feedback</h3>
          {message.feedback_text && <Text>{message.feedback_text}</Text>}
          <div className="mt-1">
            <FeedbackBadge feedback={message.feedback_type} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function QueryPage({ params }: { params: { id: string } }) {
  const {
    data: chatSessionSnapshot,
    isLoading,
    error,
  } = useSWR<ChatSessionSnapshot>(
    `/api/admin/chat-session-history/${params.id}`,
    errorHandlingFetcher
  );

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (!chatSessionSnapshot || error) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch chat session - ${error}`}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <BackButton />

        <Card className="mt-4">
          <CardContent>
            <h3>Chat Session Details</h3>

            <p className="flex flex-wrap whitespace-normal pt-1 text-sm">
              {chatSessionSnapshot.user_email || "-"},{" "}
              {timestampToReadableDate(chatSessionSnapshot.time_created)}
            </p>

            <div className="flex flex-col pt-6">
              {chatSessionSnapshot.messages.map((message) => {
                return (
                  <MessageDisplay
                    key={message.time_created}
                    message={message}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
