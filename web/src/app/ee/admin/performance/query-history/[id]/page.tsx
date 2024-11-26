"use client";

import useSWR from "swr";
import React from "react";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrism from "rehype-prism-plus";
import { Badge } from "@/components/ui/badge";
import { extractCodeText } from "@/app/chat/message/codeUtils";
import {
  MemoizedLink,
  MemoizedParagraph,
} from "@/app/chat/message/MemoizedTextComponents";
import { ChatSessionSnapshot, MessageSnapshot } from "../../usage/types";
import { CodeBlock } from "@/app/chat/message/CodeBlock";
import { Book } from "lucide-react";
import { FeedbackBadge } from "../FeedbackBadge";
import { Text } from "@tremor/react";
import { ThreeDotsLoader } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { timestampToReadableDate } from "@/lib/dateUtils";
import { errorHandlingFetcher } from "@/lib/fetcher";

import "prismjs/themes/prism-tomorrow.css";
import "../../../../../chat/message/custom-code-styles.css";

function MessageDisplay({ message }: { message: MessageSnapshot }) {
  const processContent = (content: string | JSX.Element) => {
    if (typeof content !== "string") {
      return content;
    }

    const codeBlockRegex = /```(\w*)\n[\s\S]*?```|```[\s\S]*?$/g;
    const matches = content.match(codeBlockRegex);

    if (matches) {
      content = matches.reduce((acc, match) => {
        if (!match.match(/```\w+/)) {
          return acc.replace(match, match.replace("```", "```plaintext"));
        }
        return acc;
      }, content);

      const lastMatch = matches[matches.length - 1];
      if (!lastMatch.endsWith("```")) {
        return content;
      }
    }

    return content + " [*]() ";
  };
  const finalContent = processContent(message.message as string);

  const markdownComponents = useMemo(
    () => ({
      a: MemoizedLink,
      p: MemoizedParagraph,
      code: ({ node, inline, className, children, ...props }: any) => {
        const codeText = extractCodeText(
          node,
          finalContent as string,
          children
        );

        return (
          <CodeBlock className={className} codeText={codeText}>
            {children}
          </CodeBlock>
        );
      },
    }),
    [finalContent]
  );

  const renderedMarkdown = useMemo(() => {
    return (
      <ReactMarkdown
        className="prose max-w-full markdown"
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypePrism, { ignoreMissing: true }]]}
      >
        {finalContent as string}
      </ReactMarkdown>
    );
  }, [finalContent, markdownComponents]);

  return (
    <div className="pb-6">
      <h3>{message.message_type === "user" ? "User" : "AI"}</h3>

      <div className="text-sm pt-1">
        {typeof message.message === "string" ? (
          <div className="max-w-full prose markdown">{renderedMarkdown}</div>
        ) : (
          message.message
        )}
      </div>

      {message.documents.length > 0 && (
        <div className="flex flex-col gap-y-2 pt-6">
          <h3>Reference Documents</h3>
          <div className="flex gap-2 flex-wrap">
            {message.documents.slice(0, 5).map((document) => (
              <Badge
                variant="outline"
                key={document.document_id}
                className="cursor-pointer hover:bg-opacity-80"
              >
                <Book
                  size={12}
                  className={"shrink-0" + (document.link ? " text-link" : " ")}
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
            ))}
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
