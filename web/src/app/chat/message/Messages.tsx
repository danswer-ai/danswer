"use client";

import { FeedbackType } from "../types";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import ReactMarkdown from "react-markdown";
import {
  EnmeddDocument,
  FilteredEnmeddDocument,
} from "@/lib/search/interfaces";
import { SearchSummary, ShowHideDocsButton } from "./SearchSummary";
import { SourceIcon } from "@/components/SourceIcon";
import { SkippedSearch } from "./SkippedSearch";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/CopyButton";
import { ChatFileType, FileDescriptor, ToolCallMetadata } from "../interfaces";
import {
  IMAGE_GENERATION_TOOL_NAME,
  SEARCH_TOOL_NAME,
  INTERNET_SEARCH_TOOL_NAME,
} from "../tools/constants";
import { ToolRunDisplay } from "../tools/ToolRunningAnimation";
import { DocumentPreview } from "../files/documents/DocumentPreview";
import { InMessageImage } from "../files/images/InMessageImage";
import { CodeBlock } from "./CodeBlock";
import rehypePrism from "rehype-prism-plus";

import "prismjs/themes/prism-tomorrow.css";
import "./custom-code-styles.css";
import { Assistant } from "@/app/admin/assistants/interfaces";

import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LlmOverride } from "@/lib/hooks";
import { extractCodeText } from "./codeUtils";
import { MemoizedLink, MemoizedParagraph } from "./MemoizedTextComponents";
import { Badge } from "@/components/ui/badge";
import { CustomTooltip } from "@/components/CustomTooltip";
import { CustomModal } from "@/components/CustomModal";
import {
  ThumbsDown,
  ThumbsDownIcon,
  ThumbsUp,
  ThumbsUpIcon,
  Wrench,
} from "lucide-react";
import { FeedbackModal } from "../modal/FeedbackModal";
import GeneratingImageDisplay from "../tools/GeneratingImageDisplay";
import { FiChevronLeft, FiChevronRight, FiGlobe } from "react-icons/fi";
import { ContinueGenerating } from "./ContinueMessage";

const TOOLS_WITH_CUSTOM_HANDLING = [
  SEARCH_TOOL_NAME,
  INTERNET_SEARCH_TOOL_NAME,
  IMAGE_GENERATION_TOOL_NAME,
];

function FileDisplay({
  files,
  alignBubble,
}: {
  files: FileDescriptor[];
  alignBubble?: boolean;
}) {
  const imageFiles = files.filter((file) => file.type === ChatFileType.IMAGE);
  const nonImgFiles = files.filter((file) => file.type !== ChatFileType.IMAGE);

  return (
    <>
      {nonImgFiles && nonImgFiles.length > 0 && (
        <div
          id="enmedd-file"
          className={` ${alignBubble && "ml-auto"} mt-2 auto mb-4`}
        >
          <div className="flex flex-col gap-2">
            {nonImgFiles.map((file) => {
              return (
                <div key={file.id} className="w-fit">
                  <DocumentPreview
                    fileName={file.name || file.id}
                    maxWidth="max-w-64"
                    alignBubble={alignBubble}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {imageFiles && imageFiles.length > 0 && (
        <div
          id="enmedd-image"
          className={` ${alignBubble && "ml-auto"} mt-2 auto mb-4`}
        >
          <div className="flex flex-col gap-2">
            {imageFiles.map((file) => {
              return <InMessageImage key={file.id} fileId={file.id} />;
            })}
          </div>
        </div>
      )}
    </>
  );
}

interface FeedbackDetails {
  message: string;
  predefinedFeedback?: string;
}

export const AIMessage = ({
  regenerate,
  overriddenModel,
  continueGenerating,
  isActive,
  toggleDocumentSelection,
  alternativeAssistant,
  docs,
  messageId,
  content,
  files,
  selectedDocuments,
  query,
  assistantName,
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
  currentAssistant,
  handleToggleSideBar,
  currentFeedback,
  onClose,
  onSubmit,
  isStreaming,
  otherMessagesCanSwitchTo,
  onMessageSelection,
}: {
  alternativeAssistant?: Assistant | null;
  currentAssistant: Assistant;
  isActive?: boolean;
  continueGenerating?: () => void;
  selectedDocuments?: EnmeddDocument[] | null;
  toggleDocumentSelection?: () => void;
  docs?: EnmeddDocument[] | null;
  messageId: number | null;
  content: string | JSX.Element;
  files?: FileDescriptor[];
  query?: string;
  assistantName?: string;
  citedDocuments?: [string, EnmeddDocument][] | null;
  toolCall?: ToolCallMetadata;
  isComplete?: boolean;
  hasDocs?: boolean;
  handleFeedback?: (feedbackType: FeedbackType) => void;
  isCurrentlyShowingRetrieved?: boolean;
  handleShowRetrieved?: (messageNumber: number | null) => void;
  handleSearchQueryEdit?: (query: string) => void;
  handleForceSearch?: () => void;
  retrievalDisabled?: boolean;
  overriddenModel?: string;
  regenerate?: (modelOverRide: LlmOverride) => Promise<void>;
  otherMessagesCanSwitchTo?: number[];
  onMessageSelection?: (messageId: number) => void;

  handleToggleSideBar?: () => void;
  currentFeedback?: [FeedbackType, number] | null;
  onClose?: () => void;
  onSubmit?: (feedbackDetails: {
    message: string;
    predefinedFeedback?: string;
  }) => void;
  isStreaming?: boolean;
}) => {
  const [isLikeModalOpen, setIsLikeModalOpen] = useState(false);
  const [isDislikeModalOpen, setIsDislikeModalOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showLikeButton, setShowLikeButton] = useState(true);
  const [showDislikeButton, setShowDislikeButton] = useState(true);

  const handleLikeSubmit = async (feedbackDetails: FeedbackDetails) => {
    if (onSubmit) {
      await onSubmit(feedbackDetails);
      setFeedbackSubmitted(true);
      setShowDislikeButton(false);
    }
  };

  const handleDislikeSubmit = async (feedbackDetails: FeedbackDetails) => {
    if (onSubmit) {
      await onSubmit(feedbackDetails);
      setFeedbackSubmitted(true);
      setShowLikeButton(false);
    }
  };

  const toolCallGenerating = toolCall && !toolCall.tool_result;
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

    return content + (!isComplete && !toolCallGenerating ? " [*]() " : "");
  };
  const finalContent = processContent(content as string);

  const selectedDocumentIds =
    selectedDocuments?.map((document) => document.document_id) || [];
  let citedDocumentIds: string[] = [];

  citedDocuments?.forEach((doc) => {
    citedDocumentIds.push(doc[1].document_id);
  });

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

  let filteredDocs: FilteredEnmeddDocument[] = [];

  if (docs) {
    filteredDocs = docs
      .filter(
        (doc, index, self) =>
          doc.document_id &&
          doc.document_id !== "" &&
          index === self.findIndex((d) => d.document_id === doc.document_id)
      )
      .filter((doc) => {
        return citedDocumentIds.includes(doc.document_id);
      })
      .map((doc: EnmeddDocument, ind: number) => {
        return {
          ...doc,
          included: selectedDocumentIds.includes(doc.document_id),
        };
      });
  }

  const currentMessageInd = messageId
    ? otherMessagesCanSwitchTo?.indexOf(messageId)
    : undefined;

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
        className="prose max-w-full text-base"
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypePrism, { ignoreMissing: true }]]}
      >
        {finalContent as string}
      </ReactMarkdown>
    );
  }, [finalContent, markdownComponents]);

  const includeMessageSwitcher =
    currentMessageInd !== undefined &&
    onMessageSelection &&
    otherMessagesCanSwitchTo &&
    otherMessagesCanSwitchTo.length > 1;

  const shouldShowLoader =
    !toolCall || (toolCall.tool_name === SEARCH_TOOL_NAME && !content);
  const defaultLoader = shouldShowLoader ? (
    <div className="my-auto text-sm flex flex-col gap-1">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  ) : undefined;

  return (
    <div className={`flex -mr-6 w-full pb-5`}>
      <div className="w-full">
        <div className="">
          <div className="flex">
            <AssistantIcon
              size="large"
              assistant={alternativeAssistant || currentAssistant}
            />

            <div className="my-auto ml-2 font-bold text-inverted-inverted">
              {assistantName || "enMedD AI"}
            </div>

            {query === undefined &&
              hasDocs &&
              handleShowRetrieved !== undefined &&
              isCurrentlyShowingRetrieved !== undefined &&
              !retrievalDisabled && (
                <div className="absolute flex ml-8 w-message-xs 2xl:w-message-sm 3xl:w-message-default">
                  <div className="ml-auto">
                    <ShowHideDocsButton
                      messageId={messageId}
                      isCurrentlyShowingRetrieved={isCurrentlyShowingRetrieved}
                      handleShowRetrieved={handleShowRetrieved}
                      handleToggleSideBar={handleToggleSideBar}
                    />
                  </div>
                </div>
              )}
          </div>

          <div className="pl-1.5 md:pl-12 break-words w-full">
            {!toolCall || toolCall.tool_name === SEARCH_TOOL_NAME ? (
              <>
                {query !== undefined &&
                  handleShowRetrieved !== undefined &&
                  !retrievalDisabled && (
                    <div className="mb-1">
                      <SearchSummary
                        query={query}
                        finished={toolCall?.tool_result != undefined}
                        hasDocs={hasDocs || false}
                        messageId={messageId}
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
                    <div className="mb-1">
                      <SkippedSearch handleForceSearch={handleForceSearch} />
                    </div>
                  )}
              </>
            ) : null}

            {toolCall &&
              !TOOLS_WITH_CUSTOM_HANDLING.includes(toolCall.tool_name) && (
                <div className="my-2">
                  <ToolRunDisplay
                    toolName={
                      toolCall.tool_result && content
                        ? `Used "${toolCall.tool_name}"`
                        : `Using "${toolCall.tool_name}"`
                    }
                    toolLogo={<Wrench size={15} className="my-auto mr-1" />}
                    isRunning={!toolCall.tool_result || !content}
                  />
                </div>
              )}

            {toolCall &&
              (!files || files.length == 0) &&
              toolCall.tool_name === IMAGE_GENERATION_TOOL_NAME &&
              !toolCall.tool_result && <GeneratingImageDisplay />}

            {toolCall && toolCall.tool_name === INTERNET_SEARCH_TOOL_NAME && (
              <ToolRunDisplay
                toolName={
                  toolCall.tool_result
                    ? `Searched the internet`
                    : `Searching the internet`
                }
                toolLogo={<FiGlobe size={15} className="my-auto mr-1" />}
                isRunning={!toolCall.tool_result}
              />
            )}

            {content || files ? (
              <>
                <FileDisplay files={files || []} />

                {typeof content === "string" ? (
                  <div className="max-w-full prose markdown">
                    {renderedMarkdown}
                  </div>
                ) : (
                  content
                )}
              </>
            ) : isComplete ? null : (
              defaultLoader
            )}
            {citedDocuments && citedDocuments.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                <b className="text-sm text-inverted-inverted">Sources:</b>
                <div className="flex flex-wrap gap-2">
                  {citedDocuments
                    .filter(([_, document]) => document.semantic_identifier)
                    .map(([citationKey, document], ind) => {
                      const display = (
                        <div className="w-full flex gap-1.5">
                          <SourceIcon
                            sourceType={document.source_type}
                            iconSize={16}
                          />
                          <p className="truncate">
                            [{citationKey}] {document!.semantic_identifier}
                          </p>
                        </div>
                      );
                      if (document.link) {
                        return (
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-opacity-75"
                            key={document.document_id}
                          >
                            <a
                              href={document.link}
                              target="_blank"
                              className="cursor-pointer flex truncate"
                            >
                              {display}
                            </a>
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-opacity-75"
                            key={document.document_id}
                          >
                            {display}
                          </Badge>
                        );
                      }
                    })}
                </div>
              </div>
            )}
          </div>
          {handleFeedback && (
            <div className="flex flex-row gap-x-0.5 pl-1 md:pl-12 mt-1.5">
              <div className="flex justify-start w-full gap-x-0.5">
                {includeMessageSwitcher && (
                  <div className="-mx-1 mr-auto">
                    <MessageSwitcher
                      currentPage={currentMessageInd + 1}
                      totalPages={otherMessagesCanSwitchTo.length}
                      handlePrevious={() => {
                        onMessageSelection(
                          otherMessagesCanSwitchTo[currentMessageInd - 1]
                        );
                      }}
                      handleNext={() => {
                        onMessageSelection(
                          otherMessagesCanSwitchTo[currentMessageInd + 1]
                        );
                      }}
                    />
                  </div>
                )}
              </div>
              <CopyButton content={content.toString()} smallIcon />
              {showLikeButton && (
                <CustomTooltip
                  trigger={
                    <CustomModal
                      trigger={
                        <Button
                          variant="ghost"
                          size="smallIcon"
                          onClick={() => {
                            handleFeedback("like");
                            setIsLikeModalOpen(true);
                          }}
                          className={
                            feedbackSubmitted ? "pointer-events-none" : ""
                          }
                        >
                          <ThumbsUp
                            size={16}
                            className={
                              feedbackSubmitted
                                ? "fill-primary stroke-primary cursor-not-allowed"
                                : ""
                            }
                          />
                        </Button>
                      }
                      onClose={() => setIsLikeModalOpen(false)}
                      open={isLikeModalOpen}
                      title={
                        <div className="flex text-2xl font-bold pb-6">
                          <div className="my-auto mr-1">
                            <ThumbsUpIcon className="my-auto mr-2 text-green-500" />
                          </div>
                          Provide additional feedback
                        </div>
                      }
                    >
                      <FeedbackModal
                        feedbackType="like"
                        onClose={onClose}
                        onSubmit={handleLikeSubmit}
                        onModalClose={() => setIsLikeModalOpen(false)}
                      />
                    </CustomModal>
                  }
                  side="bottom"
                >
                  Good response
                </CustomTooltip>
              )}

              {showDislikeButton && (
                <CustomTooltip
                  trigger={
                    <CustomModal
                      trigger={
                        <Button
                          variant="ghost"
                          size="smallIcon"
                          onClick={() => {
                            handleFeedback("dislike");
                            setIsDislikeModalOpen(true);
                          }}
                          className={
                            feedbackSubmitted ? "pointer-events-none" : ""
                          }
                        >
                          <ThumbsDown
                            size={16}
                            className={
                              feedbackSubmitted
                                ? "fill-primary stroke-primary cursor-not-allowed"
                                : ""
                            }
                          />
                        </Button>
                      }
                      onClose={() => setIsDislikeModalOpen(false)}
                      open={isDislikeModalOpen}
                      title={
                        <div className="flex text-2xl font-bold pb-6">
                          <div className="my-auto mr-1">
                            <ThumbsDownIcon className="my-auto mr-2 text-red-600" />
                          </div>
                          Provide additional feedback
                        </div>
                      }
                    >
                      <FeedbackModal
                        feedbackType="dislike"
                        onClose={onClose}
                        onSubmit={handleDislikeSubmit}
                        onModalClose={() => setIsDislikeModalOpen(false)}
                      />
                    </CustomModal>
                  }
                  side="bottom"
                >
                  Bad response
                </CustomTooltip>
              )}
            </div>
          )}
        </div>
        {(!toolCall || toolCall.tool_name === SEARCH_TOOL_NAME) &&
          !query &&
          continueGenerating && (
            <ContinueGenerating handleContinueGenerating={continueGenerating} />
          )}
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

      <span className="text-emphasis select-none">
        {currentPage} / {totalPages}
      </span>

      <Hoverable
        icon={FiChevronRight}
        onClick={currentPage === totalPages ? undefined : handleNext}
      />
    </div>
  );
}

import { Pencil, Image as ImageIcon } from "lucide-react";
import { User as UserTypes } from "@/lib/types";
import { UserProfile } from "@/components/UserProfile";
import { Hoverable } from "@/components/Hoverable";

export const HumanMessage = ({
  content,
  files,
  messageId,
  otherMessagesCanSwitchTo,
  onEdit,
  onMessageSelection,
  user,
  stopGenerating = () => null,
}: {
  content: string;
  files?: FileDescriptor[];
  messageId?: number | null;
  otherMessagesCanSwitchTo?: number[];
  onEdit?: (editedContent: string) => void;
  onMessageSelection?: (messageId: number) => void;
  user?: UserTypes | null;
  stopGenerating?: () => void;
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
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
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
      className="relative flex w-full pb-5 -mr-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-full">
        <div className="">
          <div className="flex">
            <div className="mx-1">
              <UserProfile user={user} size={34} textSize="text-base" />
            </div>

            <div className="my-auto ml-2 font-bold text-inverted-inverted">
              You
            </div>
          </div>
          <div className="flex flex-wrap pt-4 pl-1.5 md:pl-12 w-full">
            <div className="break-words w-full">
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
                      rounded-regular 
                      pb-2
                      [&:has(textarea:focus)]::ring-1
                      [&:has(textarea:focus)]::ring-black
                    `}
                  >
                    <Textarea
                      ref={textareaRef}
                      className={`
                      m-0 
                      focus-visible:!ring-0
                      focus-visible:!ring-offset-0
                      w-full 
                      h-auto
                      shrink
                      border-0
                      !rounded-regular 
                      whitespace-normal 
                      break-word
                      overscroll-contain
                      outline-none 
                      placeholder-gray-400 
                      resize-none
                      pl-4
                      overflow-y-auto
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
                    <div className="flex justify-end gap-2 pr-4 mt-2">
                      <Button
                        onClick={() => {
                          setEditedContent(content);
                          setIsEditing(false);
                        }}
                        variant="destructive"
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleEditSubmit}>Submit</Button>
                    </div>
                  </div>
                </div>
              ) : typeof content === "string" ? (
                <div className="relative">
                  <div className="relative flex-none whitespace-break-spaces max-w-full prose preserve-lines">
                    {content}
                  </div>

                  {onEdit &&
                    isHovered &&
                    !isEditing &&
                    (!files || files.length === 0) && (
                      <div className="bg-hover absolute -top-11 right-0 rounded">
                        <CustomTooltip
                          trigger={
                            <Button
                              variant="ghost"
                              size="smallIcon"
                              onClick={() => {
                                setIsEditing(true);
                                setIsHovered(false);
                              }}
                            >
                              <Pencil size={16} />
                            </Button>
                          }
                          asChild
                        >
                          Edit
                        </CustomTooltip>
                      </div>
                    )}
                </div>
              ) : (
                content
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-x-0.5 ml-12">
            {currentMessageInd !== undefined &&
              onMessageSelection &&
              otherMessagesCanSwitchTo &&
              otherMessagesCanSwitchTo.length > 1 && (
                <div className="ml-auto mr-3">
                  <MessageSwitcher
                    currentPage={currentMessageInd + 1}
                    totalPages={otherMessagesCanSwitchTo.length}
                    handlePrevious={() => {
                      stopGenerating();
                      onMessageSelection(
                        otherMessagesCanSwitchTo[currentMessageInd - 1]
                      );
                    }}
                    handleNext={() => {
                      stopGenerating();
                      onMessageSelection(
                        otherMessagesCanSwitchTo[currentMessageInd + 1]
                      );
                    }}
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
