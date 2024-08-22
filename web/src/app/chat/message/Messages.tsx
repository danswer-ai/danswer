"use client";

import {
  FiEdit2,
  FiChevronRight,
  FiChevronLeft,
  FiTool,
  FiGlobe,
} from "react-icons/fi";
import { FeedbackType } from "../types";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  DanswerDocument,
  FilteredDanswerDocument,
} from "@/lib/search/interfaces";
import { SearchSummary } from "./SearchSummary";
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
import { Hoverable, HoverableIcon } from "@/components/Hoverable";
import { DocumentPreview } from "../files/documents/DocumentPreview";
import { InMessageImage } from "../files/images/InMessageImage";
import { CodeBlock } from "./CodeBlock";
import rehypePrism from "rehype-prism-plus";

import "prismjs/themes/prism-tomorrow.css";
import "./custom-code-styles.css";
import { Persona } from "@/app/admin/assistants/interfaces";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { Citation } from "@/components/search/results/Citation";
import { DocumentMetadataBlock } from "@/components/search/DocumentDisplay";

import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  LikeFeedback,
  DislikeFeedback,
} from "@/components/icons/icons";
import {
  CustomTooltip,
  TooltipGroup,
} from "@/components/tooltip/CustomTooltip";
import { ValidSources } from "@/lib/types";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { useMouseTracking } from "./hooks";
import { InternetSearchIcon } from "@/components/InternetSearchIcon";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import GeneratingImageDisplay from "../tools/GeneratingImageDisplay";
import RegenerateOption from "../RegenerateOption";
import { LlmOverride } from "@/lib/hooks";
import ExceptionTraceModal from "@/components/modals/ExceptionTraceModal";

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
        <div className={` ${alignBubble && "ml-auto"} mt-2 auto mb-4`}>
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
        <div className={` ${alignBubble && "ml-auto"} mt-2 auto mb-4`}>
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

export const AIMessage = ({
  regenerate,
  alternateModel,
  shared,
  isActive,
  toggleDocumentSelection,
  alternativeAssistant,
  docs,
  messageId,
  content,
  files,
  selectedDocuments,
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
  shared?: boolean;
  isActive?: boolean;
  selectedDocuments?: DanswerDocument[] | null;
  toggleDocumentSelection?: () => void;
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
  alternateModel?: string;
  regenerate?: (modelOverRide: LlmOverride) => Promise<void>;
}) => {
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

  const [isRegenerateHovered, setIsRegenerateHovered] = useState(false);
  const { isHovering, trackedElementRef, hoverElementRef } = useMouseTracking();

  const settings = useContext(SettingsContext);
  // this is needed to give Prism a chance to load

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

  const danswerSearchToolEnabledForPersona = currentPersona.tools.some(
    (tool) => tool.in_code_tool_id === SEARCH_TOOL_NAME
  );

  let filteredDocs: FilteredDanswerDocument[] = [];

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
      .map((doc: DanswerDocument, ind: number) => {
        return {
          ...doc,
          included: selectedDocumentIds.includes(doc.document_id),
        };
      });
  }

  const uniqueSources: ValidSources[] = Array.from(
    new Set((docs || []).map((doc) => doc.source_type))
  ).slice(0, 3);

  return (
    <div ref={trackedElementRef} className={"py-5 px-2 lg:px-5 relative flex "}>
      <div
        className={`mx-auto ${shared ? "w-full" : "w-[90%]"} max-w-message-max`}
      >
        <div className={`${!shared && "mobile:ml-4 xl:ml-8"}`}>
          <div className="flex">
            <AssistantIcon
              size="small"
              assistant={alternativeAssistant || currentPersona}
            />
            <div className="w-full">
              <div className="max-w-message-max break-words">
                <div className="w-full ml-4">
                  <div className="max-w-message-max break-words">
                    {(!toolCall || toolCall.tool_name === SEARCH_TOOL_NAME) && (
                      <>
                        {query !== undefined &&
                          handleShowRetrieved !== undefined &&
                          isCurrentlyShowingRetrieved !== undefined &&
                          !retrievalDisabled && (
                            <div className="mb-1">
                              <SearchSummary
                                query={query}
                                finished={toolCall?.tool_result != undefined}
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
                            <div className="mb-1">
                              <SkippedSearch
                                handleForceSearch={handleForceSearch}
                              />
                            </div>
                          )}
                      </>
                    )}
                    {toolCall &&
                      !TOOLS_WITH_CUSTOM_HANDLING.includes(
                        toolCall.tool_name
                      ) && (
                        <ToolRunDisplay
                          toolName={
                            toolCall.tool_result && content
                              ? `Used "${toolCall.tool_name}"`
                              : `Using "${toolCall.tool_name}"`
                          }
                          toolLogo={
                            <FiTool size={15} className="my-auto mr-1" />
                          }
                          isRunning={!toolCall.tool_result || !content}
                        />
                      )}

                    {toolCall &&
                      (!files || files.length == 0) &&
                      toolCall.tool_name === IMAGE_GENERATION_TOOL_NAME &&
                      !toolCall.tool_result && <GeneratingImageDisplay />}

                    {toolCall &&
                      toolCall.tool_name === INTERNET_SEARCH_TOOL_NAME && (
                        <ToolRunDisplay
                          toolName={
                            toolCall.tool_result
                              ? `Searched the internet`
                              : `Searching the internet`
                          }
                          toolLogo={
                            <FiGlobe size={15} className="my-auto mr-1" />
                          }
                          isRunning={!toolCall.tool_result}
                        />
                      )}

                    {content || files ? (
                      <>
                        <FileDisplay files={files || []} />

                        {typeof content === "string" ? (
                          <div className="overflow-x-visible w-full pr-2 max-w-[675px]">
                            <ReactMarkdown
                              key={messageId}
                              className="prose max-w-full"
                              components={{
                                a: (props) => {
                                  const { node, ...rest } = props;
                                  const value = rest.children;

                                  if (value?.toString().startsWith("*")) {
                                    return (
                                      <div className="flex-none bg-background-800 inline-block rounded-full h-3 w-3 ml-2" />
                                    );
                                  } else if (
                                    value?.toString().startsWith("[")
                                  ) {
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
                                        onMouseDown={() =>
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
                                  <CodeBlock
                                    className="w-full"
                                    {...props}
                                    content={content as string}
                                  />
                                ),
                                p: ({ node, ...props }) => (
                                  <p {...props} className="text-default" />
                                ),
                              }}
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[
                                [rehypePrism, { ignoreMissing: true }],
                              ]}
                            >
                              {finalContent as string}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          content
                        )}
                      </>
                    ) : isComplete ? null : (
                      <></>
                    )}
                    {isComplete && docs && docs.length > 0 && (
                      <div className="mt-2 -mx-8 w-full mb-4 flex relative">
                        <div className="w-full">
                          <div className="px-8 flex gap-x-2">
                            {!settings?.isMobile &&
                              filteredDocs.length > 0 &&
                              filteredDocs.slice(0, 2).map((doc, ind) => (
                                <div
                                  key={doc.document_id}
                                  className={`w-[200px] rounded-lg flex-none transition-all duration-500 hover:bg-background-125 bg-text-100 px-4 pb-2 pt-1 border-b
                              `}
                                >
                                  <a
                                    href={doc.link || undefined}
                                    target="_blank"
                                    className="text-sm flex w-full pt-1 gap-x-1.5 overflow-hidden justify-between font-semibold text-text-700"
                                  >
                                    <Citation link={doc.link} index={ind + 1} />
                                    <p className="shrink truncate ellipsis break-all ">
                                      {doc.semantic_identifier ||
                                        doc.document_id}
                                    </p>
                                    <div className="ml-auto flex-none">
                                      {doc.is_internet ? (
                                        <InternetSearchIcon url={doc.link} />
                                      ) : (
                                        <SourceIcon
                                          sourceType={doc.source_type}
                                          iconSize={18}
                                        />
                                      )}
                                    </div>
                                  </a>
                                  <div className="flex overscroll-x-scroll mt-.5">
                                    <DocumentMetadataBlock document={doc} />
                                  </div>
                                  <div className="line-clamp-3 text-xs break-words pt-1">
                                    {doc.blurb}
                                  </div>
                                </div>
                              ))}
                            <div
                              onClick={() => {
                                if (toggleDocumentSelection) {
                                  toggleDocumentSelection();
                                }
                              }}
                              key={-1}
                              className="cursor-pointer w-[200px] rounded-lg flex-none transition-all duration-500 hover:bg-background-125 bg-text-100 px-4 py-2 border-b"
                            >
                              <div className="text-sm flex justify-between font-semibold text-text-700">
                                <p className="line-clamp-1">See context</p>
                                <div className="flex gap-x-1">
                                  {uniqueSources.map((sourceType, ind) => {
                                    return (
                                      <div key={ind} className="flex-none">
                                        <SourceIcon
                                          sourceType={sourceType}
                                          iconSize={18}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="line-clamp-3 text-xs break-words pt-1">
                                See more
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {handleFeedback &&
                    (isActive ? (
                      <div
                        className={`
                      flex md:flex-row gap-x-0.5 mt-1
                      transition-transform duration-300 ease-in-out
                      transform opacity-100 translate-y-0"
                  `}
                      >
                        <TooltipGroup>
                          <CustomTooltip showTick line content="Copy!">
                            <CopyButton content={content.toString()} />
                          </CustomTooltip>
                          <CustomTooltip showTick line content="Good response!">
                            <HoverableIcon
                              icon={<LikeFeedback />}
                              onClick={() => handleFeedback("like")}
                            />
                          </CustomTooltip>
                          <CustomTooltip showTick line content="Bad response!">
                            <HoverableIcon
                              icon={<DislikeFeedback size={16} />}
                              onClick={() => handleFeedback("dislike")}
                            />
                          </CustomTooltip>
                          {regenerate && (
                            <RegenerateOption
                              onHoverChange={setIsRegenerateHovered}
                              selectedAssistant={currentPersona!}
                              regenerate={regenerate}
                              alternateModel={alternateModel}
                            />
                          )}
                        </TooltipGroup>
                      </div>
                    ) : (
                      <div
                        ref={hoverElementRef}
                        className={`
                        absolute -bottom-4
                        invisible ${(isHovering || isRegenerateHovered || settings?.isMobile) && "!visible"}
                        opacity-0 ${(isHovering || isRegenerateHovered || settings?.isMobile) && "!opacity-100"}
                        translate-y-2 ${(isHovering || settings?.isMobile) && "!translate-y-0"}
                        transition-transform duration-300 ease-in-out 
                        flex md:flex-row gap-x-0.5 bg-background-125/40 p-1.5 rounded-lg
                        `}
                      >
                        <TooltipGroup>
                          <CustomTooltip showTick line content="Copy!">
                            <CopyButton content={content.toString()} />
                          </CustomTooltip>

                          <CustomTooltip showTick line content="Good response!">
                            <HoverableIcon
                              icon={<LikeFeedback />}
                              onClick={() => handleFeedback("like")}
                            />
                          </CustomTooltip>

                          <CustomTooltip showTick line content="Bad response!">
                            <HoverableIcon
                              icon={<DislikeFeedback size={16} />}
                              onClick={() => handleFeedback("dislike")}
                            />
                          </CustomTooltip>
                          {regenerate && (
                            <RegenerateOption
                              selectedAssistant={currentPersona!}
                              regenerate={regenerate}
                              alternateModel={alternateModel}
                              onHoverChange={setIsRegenerateHovered}
                            />
                          )}
                        </TooltipGroup>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
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

export const HumanMessage = ({
  content,
  files,
  messageId,
  otherMessagesCanSwitchTo,
  onEdit,
  onMessageSelection,
  shared,
  stopGenerating = () => null,
}: {
  shared?: boolean;
  content: string;
  files?: FileDescriptor[];
  messageId?: number | null;
  otherMessagesCanSwitchTo?: number[];
  onEdit?: (editedContent: string) => void;
  onMessageSelection?: (messageId: number) => void;
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
      className="pt-5 pb-1 px-2 lg:px-5 flex -mr-6 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`mx-auto ${shared ? "w-full" : "w-[90%]"} max-w-searchbar-max`}
      >
        <div className="xl:ml-8">
          <div className="flex flex-col mr-4">
            <FileDisplay alignBubble files={files || []} />
            <div className="flex justify-end">
              <div className="w-full ml-8 flex w-full max-w-message-max break-words">
                {isEditing ? (
                  <div className="w-full">
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
                          bg-accent 
                          text-inverted 
                          text-sm
                          rounded-lg 
                          inline-flex 
                          items-center 
                          justify-center 
                          flex-shrink-0 
                          font-medium 
                          min-h-[38px]
                          py-2
                          px-3
                          hover:bg-accent-hover
                        `}
                          onClick={handleEditSubmit}
                        >
                          Submit
                        </button>
                        <button
                          className={`
                          inline-flex 
                          items-center 
                          justify-center 
                          flex-shrink-0 
                          font-medium 
                          min-h-[38px] 
                          py-2 
                          px-3 
                          w-fit 
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
                  <>
                    <div className="ml-auto mr-1 my-auto">
                      {onEdit &&
                      isHovered &&
                      !isEditing &&
                      (!files || files.length === 0) ? (
                        <Tooltip delayDuration={1000} content={"Edit message"}>
                          <button
                            className="hover:bg-hover p-1.5 rounded"
                            onClick={() => {
                              setIsEditing(true);
                              setIsHovered(false);
                            }}
                          >
                            <FiEdit2 className="!h-4 !w-4" />
                          </button>
                        </Tooltip>
                      ) : (
                        <div className="w-7" />
                      )}
                    </div>

                    <div
                      className={`${
                        !(
                          onEdit &&
                          isHovered &&
                          !isEditing &&
                          (!files || files.length === 0)
                        ) && "ml-auto"
                      } relative   flex-none max-w-[70%] mb-auto whitespace-break-spaces rounded-3xl bg-user px-5 py-2.5`}
                    >
                      {content}
                    </div>
                  </>
                ) : (
                  <>
                    {onEdit &&
                    isHovered &&
                    !isEditing &&
                    (!files || files.length === 0) ? (
                      <div className="my-auto">
                        <Hoverable
                          icon={FiEdit2}
                          onClick={() => {
                            setIsEditing(true);
                            setIsHovered(false);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-[27px]" />
                    )}
                    <p className="ml-auto rounded-lg p-1">{content}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-x-0.5 mt-1">
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
