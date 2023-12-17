import { Bold, Text, Card, Title, Divider } from "@tremor/react";
import { ChatSessionSnapshot, MessageSnapshot } from "../../analytics/types";
import { FiBook } from "react-icons/fi";
import { timestampToReadableDate } from "@/lib/dateUtils";
import { BackButton } from "@/components/BackButton";
import { SSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { FeedbackBadge } from "../FeedbackBadge";
import { fetchSS } from "@/lib/utilsSS";

function MessageDisplay({ message }: { message: MessageSnapshot }) {
  return (
    <div>
      <Bold className="text-xs mb-1">
        {message.message_type === "user" ? "User" : "AI"}
      </Bold>
      <Text>{message.message}</Text>
      {message.documents.length > 0 && (
        <div className="flex flex-col gap-y-2 mt-2">
          <Bold className="font-bold text-xs">Reference Documents</Bold>
          {message.documents.slice(0, 5).map((document) => {
            return (
              <Text className="flex" key={document.document_id}>
                <FiBook
                  className={
                    "my-auto mr-1" + (document.link ? " text-link" : " ")
                  }
                />
                {document.link ? (
                  <a href={document.link} target="_blank" className="text-link">
                    {document.semantic_identifier}
                  </a>
                ) : (
                  document.semantic_identifier
                )}
              </Text>
            );
          })}
        </div>
      )}
      {message.feedback && (
        <div className="mt-2">
          <FeedbackBadge feedback={message.feedback} />
        </div>
      )}
      <Divider />
    </div>
  );
}

export default async function QueryPage({
  params,
}: {
  params: { id: string };
}) {
  const response = await fetchSS(`/admin/chat-session-history/${params.id}`);
  const chatSessionSnapshot = (await response.json()) as ChatSessionSnapshot;

  return (
    <main className="pt-4 mx-auto container">
      <BackButton />
      <SSRAutoRefresh />

      <Card className="mt-4">
        <Title>Chat Session Details</Title>

        <Text className="flex flex-wrap whitespace-normal mt-1 text-xs">
          {chatSessionSnapshot.user_email || "-"},{" "}
          {timestampToReadableDate(chatSessionSnapshot.time_created)}
        </Text>

        <Divider />

        <div className="flex flex-col">
          {chatSessionSnapshot.messages.map((message) => {
            return (
              <MessageDisplay key={message.time_created} message={message} />
            );
          })}
        </div>
      </Card>
    </main>
  );
}
