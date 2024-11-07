import React, { useEffect, useRef, useState } from "react";
import {
  FiPlusCircle,
  FiPlus,
  FiInfo,
  FiX,
  FiStopCircle,
} from "react-icons/fi";
import { ChatInputOption } from "./ChatInputOption";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { InputPrompt } from "@/app/admin/prompt-library/interfaces";
import {
  FilterManager,
  getDisplayNameForModel,
  LlmOverrideManager,
} from "@/lib/hooks";
import { SelectedFilterDisplay } from "./SelectedFilterDisplay";
import { useChatContext } from "@/context/ChatContext";
import { getFinalLLM } from "@/lib/llm/utils";
import { ChatFileType, FileDescriptor } from "../interfaces";
import {
  InputBarPreview,
  InputBarPreviewImageProvider,
} from "../files/InputBarPreview";
import {
  AssistantsIconSkeleton,
  CpuIconSkeleton,
  FileIcon,
  SendIcon,
  StopGeneratingIcon,
} from "@/components/icons/icons";
import { IconType } from "react-icons";
import Popup from "../../../components/popup/Popup";
import { LlmTab } from "../modal/configuration/LlmTab";
import { AssistantsTab } from "../modal/configuration/AssistantsTab";
import { EnmeddDocument } from "@/lib/search/interfaces";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { Hoverable } from "@/components/Hoverable";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { ChatState } from "../types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CirclePlus,
  CircleStop,
  Cpu,
  Filter,
  Paperclip,
  Send,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CustomModal } from "@/components/CustomModal";
import { CustomTooltip } from "@/components/CustomTooltip";
import { useRouter } from "next/navigation";
import { useAssistants } from "@/context/AssistantsContext";

const MAX_INPUT_HEIGHT = 200;

export function ChatInputBar({
  openModelSettings,
  showConfigureAPIKey,
  selectedDocuments,
  message,
  setMessage,
  stopGenerating,
  onSubmit,
  filterManager,
  llmOverrideManager,
  chatState,

  // assistants
  selectedAssistant,
  assistantOptions,
  setSelectedAssistant,
  setAlternativeAssistant,

  files,
  setFiles,
  handleFileUpload,
  textAreaRef,
  alternativeAssistant,
  chatSessionId,
  inputPrompts,
}: {
  showConfigureAPIKey: () => void;
  openModelSettings: () => void;
  chatState: ChatState;
  stopGenerating: () => void;
  selectedDocuments: EnmeddDocument[];
  assistantOptions: Assistant[];
  setAlternativeAssistant: (alternativeAssistant: Assistant | null) => void;
  setSelectedAssistant: (assistant: Assistant) => void;
  inputPrompts: InputPrompt[];
  message: string;
  setMessage: (message: string) => void;
  onSubmit: () => void;
  filterManager: FilterManager;
  llmOverrideManager: LlmOverrideManager;
  selectedAssistant: Assistant;
  alternativeAssistant: Assistant | null;
  files: FileDescriptor[];
  setFiles: (files: FileDescriptor[]) => void;
  handleFileUpload: (files: File[]) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  chatSessionId?: number;
}) {
  const { refreshAssistants } = useAssistants();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      const updateHeight = () => {
        const isSmallDevice = window.innerWidth < 768; // Adjust the breakpoint as needed

        textarea.style.height = "0px";
        textarea.style.height = `${Math.min(
          isSmallDevice ? textarea.scrollHeight : 40 + textarea.scrollHeight,
          MAX_INPUT_HEIGHT
        )}px`;
      };

      updateHeight(); // Initial update
      window.addEventListener("resize", updateHeight); // Update on resize

      return () => {
        window.removeEventListener("resize", updateHeight); // Clean up on unmount
      };
    }
  }, [message]);

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        event.preventDefault();
        handleFileUpload(pastedFiles);
      }
    }
  };

  const { llmProviders } = useChatContext();
  const [_, llmName] = getFinalLLM(llmProviders, selectedAssistant, null);

  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  const interactionsRef = useRef<HTMLDivElement | null>(null);

  const hideSuggestions = () => {
    setShowSuggestions(false);
    setTabbingIconIndex(0);
  };

  const hidePrompts = () => {
    setTimeout(() => {
      setShowPrompts(false);
    }, 50);

    setTabbingIconIndex(0);
  };

  const updateInputPrompt = (prompt: InputPrompt) => {
    hidePrompts();
    setMessage(`${prompt.content}`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        (!interactionsRef.current ||
          !interactionsRef.current.contains(event.target as Node))
      ) {
        hideSuggestions();
        hidePrompts();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const updatedTaggedAssistant = (assistant: Assistant) => {
    setAlternativeAssistant(
      assistant.id == selectedAssistant.id ? null : assistant
    );
    hideSuggestions();
    setMessage("");
  };

  const handleAssistantInput = (text: string) => {
    if (!text.startsWith("@")) {
      hideSuggestions();
    } else {
      const match = text.match(/(?:\s|^)@(\w*)$/);
      if (match) {
        setShowSuggestions(true);
      } else {
        hideSuggestions();
      }
    }
  };

  const handlePromptInput = (text: string) => {
    if (!text.startsWith("/")) {
      hidePrompts();
    } else {
      const promptMatch = text.match(/(?:\s|^)\/(\w*)$/);
      if (promptMatch) {
        setShowPrompts(true);
      } else {
        hidePrompts();
      }
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setMessage(text);
    handleAssistantInput(text);
    handlePromptInput(text);
  };

  const assistantTagOptions = assistantOptions.filter((assistant) =>
    assistant.name.toLowerCase().startsWith(
      message
        .slice(message.lastIndexOf("@") + 1)
        .split(/\s/)[0]
        .toLowerCase()
    )
  );

  const filteredPrompts = inputPrompts.filter(
    (prompt) =>
      prompt.active &&
      prompt.prompt.toLowerCase().startsWith(
        message
          .slice(message.lastIndexOf("/") + 1)
          .split(/\s/)[0]
          .toLowerCase()
      )
  );

  const [tabbingIconIndex, setTabbingIconIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      ((showSuggestions && assistantTagOptions.length > 0) || showPrompts) &&
      (e.key === "Tab" || e.key == "Enter")
    ) {
      e.preventDefault();

      if (
        (tabbingIconIndex == assistantTagOptions.length && showSuggestions) ||
        (tabbingIconIndex == filteredPrompts.length && showPrompts)
      ) {
        if (showPrompts) {
          window.open("/prompts", "_self");
        } else {
          window.open("/assistants/new", "_self");
        }
      } else {
        if (showPrompts) {
          const uppity =
            filteredPrompts[tabbingIconIndex >= 0 ? tabbingIconIndex : 0];
          updateInputPrompt(uppity);
        } else {
          const option =
            assistantTagOptions[tabbingIconIndex >= 0 ? tabbingIconIndex : 0];

          updatedTaggedAssistant(option);
        }
      }
    }
    if (!showPrompts && !showSuggestions) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      setTabbingIconIndex((tabbingIconIndex) =>
        Math.min(
          tabbingIconIndex + 1,
          showPrompts ? filteredPrompts.length : assistantTagOptions.length
        )
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setTabbingIconIndex((tabbingIconIndex) =>
        Math.max(tabbingIconIndex - 1, 0)
      );
    }
  };

  const handleSelectAssistant = async (assistant: Assistant) => {
    setSelectedAssistant(assistant);
    await refreshAssistants();
    closeModal();
    router.refresh();
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const divRef = useRef<HTMLDivElement>(null);
  const [isShowing, setIsShowing] = useState(false);

  const handleShowTools = () => {
    setIsShowing(!isShowing);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (divRef.current && !divRef.current.contains(event.target as Node)) {
      setIsShowing(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div id="enmedd-chat-input">
      {isModalOpen && (
        <CustomModal
          title="Change Assistant"
          open={isModalOpen}
          onClose={closeModal}
          trigger={null}
        >
          <AssistantsTab
            llmProviders={llmProviders}
            selectedAssistant={selectedAssistant}
            onSelect={handleSelectAssistant}
          />
        </CustomModal>
      )}

      <div className="flex justify-center items-center max-w-full mx-auto px-5 md:px-8 lg:px-5 2xl:px-0">
        <div
          ref={divRef}
          className={`flex md:hidden items-center trasition-all ease-in-out duration-500 ${
            isShowing ? "w-[150px]" : "w-10"
          }`}
        >
          <CirclePlus
            size={24}
            className="mr-4 shrink-0"
            onClick={handleShowTools}
          />
          <Cpu size={24} onClick={openModal} className="mr-4 shrink-0" />

          <Paperclip
            size={24}
            className="mr-4 shrink-0"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.onchange = (event: any) => {
                const files = Array.from(event?.target?.files || []) as File[];
                if (files.length > 0) {
                  handleFileUpload(files);
                }
              };
              input.click();
            }}
          />
        </div>

        <div className="relative w-full mx-auto shrink 2xl:w-searchbar 3xl:px-0">
          {showSuggestions && assistantTagOptions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="text-sm absolute inset-x-0 top-0 w-full transform -translate-y-full"
            >
              <div className="rounded-lg py-1.5 bg-background border border-border-medium shadow-lg mx-2 px-1.5 mt-2 z-10">
                {assistantTagOptions.map((currentAssistant, index) => (
                  <button
                    key={index}
                    className={`px-2 ${
                      tabbingIconIndex == index && "bg-hover-lightish"
                    }  rounded-lg content-start flex gap-x-1 py-2 w-full  hover:bg-hover-lightish cursor-pointer`}
                    onClick={() => {
                      updatedTaggedAssistant(currentAssistant);
                    }}
                  >
                    <p className="font-bold">{currentAssistant.name}</p>
                    <p className="line-clamp-1">
                      {currentAssistant.id == selectedAssistant.id &&
                        "(default) "}
                      {currentAssistant.description}
                    </p>
                  </button>
                ))}

                <a
                  key={assistantTagOptions.length}
                  target="_self"
                  className={`${
                    tabbingIconIndex == assistantTagOptions.length && "bg-hover"
                  } rounded-lg px-3 flex gap-x-1 py-2 w-full  items-center  hover:bg-hover-lightish cursor-pointer"`}
                  href="/assistants/new"
                >
                  <FiPlus size={17} />
                  <p>Create a new assistant</p>
                </a>
              </div>
            </div>
          )}

          {showPrompts && (
            <div
              ref={suggestionsRef}
              className="text-sm absolute inset-x-0 top-0 w-full transform -translate-y-full"
            >
              <div className="rounded-lg py-1.5 bg-white border border-border-medium overflow-hidden shadow-lg mx-2 px-1.5 mt-2 z-10">
                {filteredPrompts.map((currentPrompt, index) => (
                  <button
                    key={index}
                    className={`px-2 ${
                      tabbingIconIndex == index && "bg-hover"
                    } rounded content-start flex gap-x-1 py-1.5 w-full  hover:bg-hover cursor-pointer`}
                    onClick={() => {
                      updateInputPrompt(currentPrompt);
                    }}
                  >
                    <p className="font-bold">{currentPrompt.prompt}:</p>
                    <p className="text-left flex-grow mr-auto line-clamp-1">
                      {currentPrompt.id == selectedAssistant.id && "(default) "}
                      {currentPrompt.content?.trim()}
                    </p>
                  </button>
                ))}

                <a
                  key={filteredPrompts.length}
                  target="_self"
                  className={`${
                    tabbingIconIndex == filteredPrompts.length && "bg-hover"
                  } px-3 flex gap-x-1 py-2 w-full  items-center  hover:bg-hover-light cursor-pointer"`}
                  href="/prompts"
                >
                  <FiPlus size={17} />
                  <p>Create a new prompt</p>
                </a>
              </div>
            </div>
          )}

          <Button
            onClick={() => {
              if (message) {
                onSubmit();
              }
            }}
            disabled={chatState != "input"}
            className="absolute right-3.5 bottom-3 rounded-full w-8 h-8 md:hidden"
            size="xs"
          >
            <Send size={16} />
          </Button>

          <div>
            <SelectedFilterDisplay filterManager={filterManager} />
          </div>

          <div
            className="
                opacity-100
                w-full
                h-fit
                flex
                flex-col
                rounded-xl
                overflow-hidden
                bg-background
                [&:has(textarea:focus)]::ring-1
                [&:has(textarea:focus)]::ring-black
                px-4
                lg:px-6
                border
              "
          >
            {alternativeAssistant && (
              <div className="flex flex-wrap gap-y-1 gap-x-2 px-2 pt-1.5 w-full">
                <div
                  ref={interactionsRef}
                  className="bg-background-200 p-2 rounded-t-lg items-center flex w-full"
                >
                  <AssistantIcon assistant={alternativeAssistant} />
                  <p className="ml-3 text-strong my-auto">
                    {alternativeAssistant.name}
                  </p>
                  <div className="flex gap-x-1 ml-auto">
                    <CustomTooltip
                      trigger={
                        <>
                          <Hoverable icon={FiInfo} />
                        </>
                      }
                    >
                      <p className="max-w-xs flex flex-wrap">
                        {alternativeAssistant.description}
                      </p>
                    </CustomTooltip>

                    <Hoverable
                      icon={FiX}
                      onClick={() => setAlternativeAssistant(null)}
                    />
                  </div>
                </div>
              </div>
            )}
            {(selectedDocuments.length > 0 || files.length > 0) && (
              <div className="flex gap-x-2 px-2 pt-2">
                <div className="flex gap-x-1 px-2 overflow-y-auto overflow-x-scroll items-end miniscroll">
                  {files.map((file) => (
                    <div className="flex-none" key={file.id}>
                      {file.type === ChatFileType.IMAGE ? (
                        <InputBarPreviewImageProvider
                          file={file}
                          onDelete={() => {
                            setFiles(
                              files.filter(
                                (fileInFilter) => fileInFilter.id !== file.id
                              )
                            );
                          }}
                          isUploading={file.isUploading || false}
                        />
                      ) : (
                        <InputBarPreview
                          file={file}
                          onDelete={() => {
                            setFiles(
                              files.filter(
                                (fileInFilter) => fileInFilter.id !== file.id
                              )
                            );
                          }}
                          isUploading={file.isUploading || false}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Textarea
              onPaste={handlePaste}
              onKeyDownCapture={handleKeyDown}
              onChange={handleInputChange}
              ref={textAreaRef}
              className={`
                m-0
                px-0
                pr-10
                md:pr-0
                pb-3
                pt-4
                xl:py-6
                text-base
                w-full
                shrink
                resize-none
                rounded-lg
                border-0
                bg-background-chatbar
                placeholder:text-text-chatbar-subtle
                ${
                  textAreaRef.current &&
                  textAreaRef.current.scrollHeight > MAX_INPUT_HEIGHT
                    ? "overflow-y-auto mt-2"
                    : ""
                }
                whitespace-normal
                break-word
                overscroll-contain
                outline-none
                placeholder-subtle
                resize-none
                h-12
                xl:h-28
                focus-visible:!ring-0
                focus-visible:!ring-offset-0
              `}
              autoFocus
              style={{ scrollbarWidth: "thin" }}
              role="textarea"
              aria-multiline
              placeholder="Send a message"
              value={message}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !showPrompts &&
                  !showSuggestions &&
                  !event.shiftKey &&
                  !(event.nativeEvent as any).isComposing
                ) {
                  event.preventDefault();
                  if (message) {
                    onSubmit();
                  }
                }
              }}
              suppressContentEditableWarning={true}
            />
            <div className="hidden md:flex items-center justify-between py-4 overflow-hidden border-t border-border-light">
              <div className="flex w-auto items-center">
                <Button
                  variant="ghost"
                  className="mr-2 border"
                  onClick={openModal}
                >
                  <Cpu size={16} className="shrink-0" />
                  {selectedAssistant ? selectedAssistant.name : "Assistants"}
                </Button>

                <Button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true; // Allow multiple files
                    input.onchange = (event: any) => {
                      const files = Array.from(
                        event?.target?.files || []
                      ) as File[];
                      if (files.length > 0) {
                        handleFileUpload(files);
                      }
                    };
                    input.click();
                  }}
                  variant="ghost"
                >
                  <Paperclip size={16} />
                  File
                </Button>
              </div>
              <div>
                {chatState == "streaming" ||
                chatState == "toolBuilding" ||
                chatState == "loading" ? (
                  <Button
                    onClick={stopGenerating}
                    disabled={chatState != "streaming"}
                  >
                    <StopGeneratingIcon
                      className="text-white m-auto flex-none"
                      size={10}
                    />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (message) {
                        onSubmit();
                      }
                    }}
                    disabled={chatState != "input"}
                  >
                    <Send size={16} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
