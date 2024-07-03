"use client";

import {
  FiCpu,
  FiImage,
  FiThumbsDown,
  FiThumbsUp,
  FiUser,
  FiEdit2,
  FiChevronRight,
  FiChevronLeft,
  FiTool,
} from "react-icons/fi";
import { FeedbackType } from "../types";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { DanswerDocument } from "@/lib/search/interfaces";
import { SearchSummary, ShowHideDocsButton } from "./SearchSummary";
import { SourceIcon } from "@/components/SourceIcon";
import { ThreeDots } from "react-loader-spinner";
import { SkippedSearch } from "./SkippedSearch";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/CopyButton";
import { ChatFileType, FileDescriptor, ToolCallMetadata } from "../interfaces";
import {
  IMAGE_GENERATION_TOOL_NAME,
  SEARCH_TOOL_NAME,
} from "../tools/constants";
import { ToolRunDisplay } from "../tools/ToolRunningAnimation";
import { Hoverable } from "@/components/Hoverable";
import { DocumentPreview } from "../files/documents/DocumentPreview";
import { InMessageImage } from "../files/images/InMessageImage";
import { CodeBlock } from "./CodeBlock";
import rehypePrism from "rehype-prism-plus";

// Prism stuff
import Prism from "prismjs";

import "prismjs/themes/prism-tomorrow.css";
import "./custom-code-styles.css";
import { Persona } from "@/app/admin/assistants/interfaces";
import { Button } from "@tremor/react";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import Citation from "@/components/search/results/Citation";
import {
  buildDocumentSummaryDisplay,
  DocumentMetadataBlock,
} from "@/components/search/DocumentDisplay";

const TOOLS_WITH_CUSTOM_HANDLING = [
  SEARCH_TOOL_NAME,
  IMAGE_GENERATION_TOOL_NAME,
];

function FileDisplay({ files }: { files: FileDescriptor[] }) {
  const imageFiles = files.filter((file) => file.type === ChatFileType.IMAGE);
  const nonImgFiles = files.filter((file) => file.type !== ChatFileType.IMAGE);

  return (
    <>
      {nonImgFiles && nonImgFiles.length > 0 && (
        <div className="mt-2 mb-4">
          <div className="flex flex-col gap-2">
            {nonImgFiles.map((file) => {
              return (
                <div key={file.id} className="w-fit">
                  <DocumentPreview
                    fileName={file.name || file.id}
                    maxWidth="max-w-64"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {imageFiles && imageFiles.length > 0 && (
        <div className="mt-2 mb-4">
          <div className="flex flex-wrap gap-2">
            {imageFiles.map((file) => {
              return <InMessageImage key={file.id} fileId={file.id} />;
            })}
          </div>
        </div>
      )}
    </>
  );
}

export const AIMessage = ({
  alternativeAssistant,
  docs,
  messageId,
  content,
  files,
  query,
  personaName,
  citedDocuments,
  toolCall,
  isComplete,
  hasDocs,
  handleFeedback,
  isCurrentlyShowingRetrieved,
  handleShowRetrieved,
  handleSearchQueryEdit,
  handleForceSearch,
  retrievalDisabled,
  currentPersona,
}: {
  docs?: DanswerDocument[] | null;
  alternativeAssistant?: Persona | null;
  currentPersona: Persona;
  messageId: number | null;
  content: string | JSX.Element;
  files?: FileDescriptor[];
  query?: string;
  personaName?: string;
  citedDocuments?: [string, DanswerDocument][] | null;
  toolCall?: ToolCallMetadata;
  isComplete?: boolean;
  hasDocs?: boolean;
  handleFeedback?: (feedbackType: FeedbackType) => void;
  isCurrentlyShowingRetrieved?: boolean;
  handleShowRetrieved?: (messageNumber: number | null) => void;
  handleSearchQueryEdit?: (query: string) => void;
  handleForceSearch?: () => void;
  retrievalDisabled?: boolean;
}) => {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    Prism.highlightAll();
    setIsReady(true);
  }, []);

  // this is needed to give Prism a chance to load
  if (!isReady) {
    return <div />;
  }

  if (!isComplete) {
    const trimIncompleteCodeSection = (
      content: string | JSX.Element
    ): string | JSX.Element => {
      if (typeof content === "string") {
        const pattern = /```[a-zA-Z]+[^\s]*$/;
        const match = content.match(pattern);
        if (match && match.index && match.index > 3) {
          const newContent = content.slice(0, match.index - 3);
          return newContent;
        }
        return content;
      }
      return content;
    };

    content = trimIncompleteCodeSection(content);
  }

  const shouldShowLoader =
    !toolCall || (toolCall.tool_name === SEARCH_TOOL_NAME && !content);
  const defaultLoader = shouldShowLoader ? (
    <div className="text-sm my-auto">
      <ThreeDots
        height="30"
        width="50"
        color="#3b82f6"
        ariaLabel="grid-loading"
        radius="12.5"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
      />
    </div>
  ) : undefined;

  return (
    <div className={"py-5 px-2 lg:px-5  flex -mr-6 w-full"}>
      <div className="mx-auto w-[90%] max-w-searchbar-max relative">
        <div className="xl:ml-8">
          <div className="flex">
            <AssistantIcon
              size="small"
              assistant={alternativeAssistant || currentPersona}
            />

            <div className="font-bold text-emphasis ml-2 my-auto">
              {alternativeAssistant
                ? alternativeAssistant.name
                : personaName || "Danswer"}
            </div>

            {/* {query === undefined &&
              hasDocs &&
              handleShowRetrieved !== undefined &&
              isCurrentlyShowingRetrieved !== undefined &&
              !retrievalDisabled && (
                <div className="flex w-full max-w-message-max absolute ml-8">
                  <div className="ml-auto">
                    <ShowHideDocsButton
                      messageId={messageId}
                      isCurrentlyShowingRetrieved={isCurrentlyShowingRetrieved}
                      handleShowRetrieved={handleShowRetrieved}
                    />
                  </div>
                </divch>
              )} */}
          </div>

          <div className="max-w-message-max break-words mt-1 ml-8">
            {(!toolCall || toolCall.tool_name === SEARCH_TOOL_NAME) && (
              <>
                {query !== undefined &&
                  handleShowRetrieved !== undefined &&
                  isCurrentlyShowingRetrieved !== undefined &&
                  !retrievalDisabled && (
                    <div className="my-1">
                      <SearchSummary
                        query={query}
                        hasDocs={hasDocs || false}
                        messageId={messageId}
                        isCurrentlyShowingRetrieved={
                          isCurrentlyShowingRetrieved
                        }
                        handleShowRetrieved={handleShowRetrieved}
                        handleSearchQueryEdit={handleSearchQueryEdit}
                      />
                    </div>
                  )}
                {handleForceSearch &&
                  content &&
                  query === undefined &&
                  !hasDocs &&
                  !retrievalDisabled && (
                    <div className="my-1">
                      <SkippedSearch handleForceSearch={handleForceSearch} />
                    </div>
                  )}
              </>
            )}

            {toolCall &&
              !TOOLS_WITH_CUSTOM_HANDLING.includes(toolCall.tool_name) && (
                <div className="my-2">
                  <ToolRunDisplay
                    toolName={
                      toolCall.tool_result && content
                        ? `Used "${toolCall.tool_name}"`
                        : `Using "${toolCall.tool_name}"`
                    }
                    toolLogo={<FiTool size={15} className="my-auto mr-1" />}
                    isRunning={!toolCall.tool_result || !content}
                  />
                </div>
              )}

            {toolCall &&
              toolCall.tool_name === IMAGE_GENERATION_TOOL_NAME &&
              !toolCall.tool_result && (
                <div className="my-2">
                  <ToolRunDisplay
                    toolName={`Generating images`}
                    toolLogo={<FiImage size={15} className="my-auto mr-1" />}
                    isRunning={!toolCall.tool_result}
                  />
                </div>
              )}

            {docs && docs.length > 0 && (
              <div className="w-full flex ">
                <div className="w-full relative overflow-x-scroll no-scrollbar">
                  {/* <div className="absolute left-0 h-full w-20 bg-gradient-to-r from-background to-background/20 " /> */}
                  <div className="flex gap-x-2">
                    {docs
                      .filter(
                        (doc, index, self) =>
                          doc.document_id &&
                          doc.document_id !== "" &&
                          index ===
                            self.findIndex(
                              (d) => d.document_id === doc.document_id
                            )
                      )
                      .map((doc) => (
                        <div
                          key={doc.document_id}
                          className={`w-[200px] rounded-lg  flex-none transition-all duration-500 opacity-90 hover:bg-neutral-200 bg-neutral-100 px-4 py-2  border-b 
                        ${
                          !isComplete
                            ? "animate-pulse"
                            : citedDocuments &&
                              (Array.isArray(citedDocuments) &&
                              citedDocuments.some(
                                ([_, obj]) =>
                                  obj.document_id === doc.document_id
                              )
                                ? "!opacity-100"
                                : "!opacity-20")
                        }
                        `}
                        >
                          <a
                            href={doc.link}
                            target="_blank"
                            className="text-sm flex justify-between font-semibold text-neutral-800"
                          >
                            {
                              doc.document_id.split("/")[
                                doc.document_id.split("/").length - 1
                              ]
                            }
                            <div className="flex-none">
                              <SourceIcon
                                sourceType={doc.source_type}
                                iconSize={18}
                              />
                            </div>
                          </a>

                          <div className="flex  overscroll-x-scroll mt-1">
                            <DocumentMetadataBlock document={doc} />
                          </div>

                          {/* <p className="pl-1 pt-2 pb-1 break-words">
                            {buildDocumentSummaryDisplay(doc.match_highlights, doc.blurb)}
                          </p> */}
                          <div className="line-clamp-3 text-xs break-words   pt-1">
                            {doc.blurb}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <button className="my-auto h-full flex-none p-2">
                  <svg
                    className="text-neutral-700 hover:text-neutral-900 h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    width="200"
                    height="200"
                    viewBox="0 0 16 16"
                  >
                    <g fill="currentColor">
                      <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69z" />
                      <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25z" />
                    </g>
                  </svg>
                </button>
              </div>
            )}

            {content ? (
              <>
                <FileDisplay files={files || []} />

                {typeof content === "string" ? (
                  <ReactMarkdown
                    key={messageId}
                    className="prose max-w-full"
                    components={{
                      a: (props) => {
                        const { node, ...rest } = props;
                        const value = rest.children;
                        if (value?.toString().startsWith("[")) {
                          // for some reason <a> tags cause the onClick to not apply
                          // and the links are unclickable
                          // TODO: fix the fact that you have to double click to follow link
                          // for the first link
                          return (
                            <Citation
                              link={rest?.href}
                              key={node?.position?.start?.offset}
                            >
                              {rest.children}
                            </Citation>
                          );
                        } else {
                          return (
                            <a
                              key={node?.position?.start?.offset}
                              onClick={() =>
                                rest.href
                                  ? window.open(rest.href, "_blank")
                                  : undefined
                              }
                              className="cursor-pointer text-link hover:text-link-hover"
                            >
                              {rest.children}
                            </a>
                          );
                        }
                      },
                      code: (props) => (
                        <CodeBlock {...props} content={content as string} />
                      ),
                      p: ({ node, ...props }) => (
                        <p {...props} className="text-default" />
                      ),
                    }}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[[rehypePrism, { ignoreMissing: true }]]}
                  >
                    {content}
                  </ReactMarkdown>
                ) : (
                  content
                )}
              </>
            ) : isComplete ? null : (
              defaultLoader
            )}
            {/* {citedDocuments && citedDocuments.length > 0 && (
              <div className="mt-2">
                <b className="text-sm text-emphasis">Sources:</b>
                <div className="flex flex-wrap gap-2">
                  {citedDocuments
                    .filter(([_, document]) => document.semantic_identifier)
                    .map(([citationKey, document], ind) => {
                      const display = (
                        <div className="max-w-350 text-ellipsis flex text-sm border border-border py-1 px-2 rounded flex">
                          <div className="mr-1 my-auto">
                            <SourceIcon
                              sourceType={document.source_type}
                              iconSize={16}
                            />
                          </div>
                          [{citationKey}] {document!.semantic_identifier}
                        </div>
                      );

                      if (document.link) {
                        return (
                          <a
                            key={document.document_id}
                            href={document.link}
                            target="_blank"
                            className="cursor-pointer hover:bg-hover"
                          >
                            {display}
                          </a>
                        );
                      } else {
                        return (
                          <div
                            key={document.document_id}
                            className="cursor-default"
                          >
                            {display}
                          </div>
                        );
                      }
                    })}
                </div>
              </div>
            )} */}
          </div>
          {handleFeedback && (
            <div className="flex md:flex-row gap-x-0.5 ml-8 mt-1.5">
              <CopyButton content={content.toString()} />
              <Hoverable
                icon={FiThumbsUp}
                onClick={() => handleFeedback("like")}
              />
              <Hoverable
                icon={FiThumbsDown}
                onClick={() => handleFeedback("dislike")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function MessageSwitcher({
  currentPage,
  totalPages,
  handlePrevious,
  handleNext,
}: {
  currentPage: number;
  totalPages: number;
  handlePrevious: () => void;
  handleNext: () => void;
}) {
  return (
    <div className="flex items-center text-sm space-x-0.5">
      <Hoverable
        icon={FiChevronLeft}
        onClick={currentPage === 1 ? undefined : handlePrevious}
      />
      <span className="text-emphasis text-medium select-none">
        {currentPage} / {totalPages}
      </span>
      <Hoverable
        icon={FiChevronRight}
        onClick={currentPage === totalPages ? undefined : handleNext}
      />
    </div>
  );
}

export const HumanMessage = ({
  content,
  files,
  messageId,
  otherMessagesCanSwitchTo,
  onEdit,
  onMessageSelection,
}: {
  content: string;
  files?: FileDescriptor[];
  messageId?: number | null;
  otherMessagesCanSwitchTo?: number[];
  onEdit?: (editedContent: string) => void;
  onMessageSelection?: (messageId: number) => void;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  useEffect(() => {
    if (!isEditing) {
      setEditedContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (textareaRef.current) {
      // Focus the textarea
      textareaRef.current.focus();
      // Move the cursor to the end of the text
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleEditSubmit = () => {
    if (editedContent.trim() !== content.trim()) {
      onEdit?.(editedContent);
    }
    setIsEditing(false);
  };

  const currentMessageInd = messageId
    ? otherMessagesCanSwitchTo?.indexOf(messageId)
    : undefined;

  return (
    <div
      className="pt-5 pb-1 px-2 lg:px-5 flex -mr-6 w-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mx-auto w-full max-w-searchbar-max">
        <div className="xl:ml-8">
          <div className="flex">
            <div className="p-1 bg-user rounded-lg h-fit">
              <div className="text-inverted">
                <FiUser size={16} className="my-auto mx-auto" />
              </div>
            </div>

            <div className="font-bold text-emphasis ml-2 my-auto">You</div>
          </div>
          <div className="mx-auto mt-1 ml-8 mx-4 max-w-searchbar-max flex flex-wrap">
            <div className="w-full max-w-message-max break-words">
              <FileDisplay files={files || []} />

              {isEditing ? (
                <div>
                  <div
                    className={`
                      opacity-100
                      w-full
                      flex
                      flex-col
                      border 
                      border-border 
                      rounded-lg 
                      bg-background-emphasis 
                      pb-2
                      [&:has(textarea:focus)]::ring-1
                      [&:has(textarea:focus)]::ring-black
                    `}
                  >
                    <textarea
                      ref={textareaRef}
                      className={`
                      m-0 
                      w-full 
                      h-auto
                      shrink
                      border-0
                      rounded-lg 
                      overflow-y-hidden
                      bg-background-emphasis 
                      whitespace-normal 
                      break-word
                      overscroll-contain
                      outline-none 
                      placeholder-gray-400 
                      resize-none
                      pl-4
                      overflow-y-auto
                      pr-12 
                      py-4`}
                      aria-multiline
                      role="textarea"
                      value={editedContent}
                      style={{ scrollbarWidth: "thin" }}
                      onChange={(e) => {
                        setEditedContent(e.target.value);
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditedContent(content);
                          setIsEditing(false);
                        }
                        // Submit edit if "Command Enter" is pressed, like in ChatGPT
                        if (e.key === "Enter" && e.metaKey) {
                          handleEditSubmit();
                        }
                      }}
                    />
                    <div className="flex justify-end mt-2 gap-2 pr-4">
                      <button
                        className={`
                          w-fit 
                          p-1 
                          bg-accent 
                          text-inverted 
                          text-sm
                          rounded-lg 
                          hover:bg-accent-hover
                        `}
                        onClick={handleEditSubmit}
                      >
                        Submit
                      </button>
                      <button
                        className={`
                          w-fit 
                          p-1 
                          bg-hover
                          bg-background-strong 
                          text-sm
                          rounded-lg
                          hover:bg-hover-emphasis
                        `}
                        onClick={() => {
                          setEditedContent(content);
                          setIsEditing(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : typeof content === "string" ? (
                <div className="flex flex-col preserve-lines prose max-w-full">
                  {content}
                </div>
              ) : (
                content
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-x-0.5 ml-8 mt-1">
            {currentMessageInd !== undefined &&
              onMessageSelection &&
              otherMessagesCanSwitchTo &&
              otherMessagesCanSwitchTo.length > 1 && (
                <div className="mr-2">
                  <MessageSwitcher
                    currentPage={currentMessageInd + 1}
                    totalPages={otherMessagesCanSwitchTo.length}
                    handlePrevious={() =>
                      onMessageSelection(
                        otherMessagesCanSwitchTo[currentMessageInd - 1]
                      )
                    }
                    handleNext={() =>
                      onMessageSelection(
                        otherMessagesCanSwitchTo[currentMessageInd + 1]
                      )
                    }
                  />
                </div>
              )}
            {onEdit &&
            isHovered &&
            !isEditing &&
            (!files || files.length === 0) ? (
              <Hoverable
                icon={FiEdit2}
                onClick={() => {
                  setIsEditing(true);
                  setIsHovered(false);
                }}
              />
            ) : (
              <div className="h-[27px]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
