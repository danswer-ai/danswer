"use client";

import ReactMarkdown from "react-markdown";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { useContext } from "react";
import remarkGfm from "remark-gfm";

export function ChatBanner() {
  const settings = useContext(SettingsContext);

  return (
    <div
      className={`
      z-masked 
      h-[30px]
      bg-background-custom-header
      shadow-sm
      m-2
      rounded
      border-border
      border
      flex mt-10`}
    >
      <div className="flex flex-col mx-auto text-sm ">
        <div className="my-auto">
          <ReactMarkdown
            className="max-w-full prose"
            components={{
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  className="text-sm text-link hover:text-link-hover"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              p: ({ node, ...props }) => <p {...props} className="text-sm" />,
            }}
            remarkPlugins={[remarkGfm]}
          >
            {/* TODO: replace with other things such as notifications, etc. */}
            Under construction
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
