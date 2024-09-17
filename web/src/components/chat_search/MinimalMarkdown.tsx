import { CodeBlock } from "@/app/chat/message/CodeBlock";
import {
  MemoizedLink,
  MemoizedParagraph,
} from "@/app/chat/message/MemoizedTextComponents";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MinimalMarkdownProps {
  content: string;
  className?: string;
  useCodeBlock?: boolean;
}

export const MinimalMarkdown: React.FC<MinimalMarkdownProps> = ({
  content,
  className = "",
  useCodeBlock = false,
}) => {
  return (
    <ReactMarkdown
      className={`w-full text-wrap break-word ${className}`}
      components={{
        a: MemoizedLink,
        p: MemoizedParagraph,
        code: useCodeBlock
          ? (props) => (
              <CodeBlock className="w-full" {...props} content={content} />
            )
          : (props) => <code {...props} />,
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
};
