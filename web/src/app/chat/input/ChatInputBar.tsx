import React, { useEffect, useRef, useState } from "react";
import { Persona } from "@/app/admin/assistants/interfaces";
import { FilterManager, LlmOverrideManager } from "@/lib/hooks";
import { useChatContext } from "@/components/context/ChatContext";
import { getFinalLLM } from "@/lib/llm/utils";
import { FileDescriptor } from "../interfaces";
import { InputBarPreview } from "../files/InputBarPreview";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Cpu,
  Paperclip,
  Mic,
  ImagePlus,
  Send,
  Plus,
  Info,
  CirclePlus,
  X,
} from "lucide-react";

const MAX_INPUT_HEIGHT = 200;

export function ChatInputBar({
  personas,
  message,
  setMessage,
  onSubmit,
  isStreaming,
  setIsCancelled,
  retrievalDisabled,
  filterManager,
  llmOverrideManager,
  onSetSelectedAssistant,
  selectedAssistant,
  files,
  setFiles,
  handleFileUpload,
  setConfigModalActiveTab,
  textAreaRef,
  alternativeAssistant,
}: {
  onSetSelectedAssistant: (alternativeAssistant: Persona | null) => void;
  personas: Persona[];
  message: string;
  setMessage: (message: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  setIsCancelled: (value: boolean) => void;
  retrievalDisabled: boolean;
  filterManager: FilterManager;
  llmOverrideManager: LlmOverrideManager;
  selectedAssistant: Persona;
  alternativeAssistant: Persona | null;
  files: FileDescriptor[];
  setFiles: (files: FileDescriptor[]) => void;
  handleFileUpload: (files: File[]) => void;
  setConfigModalActiveTab: (tab: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  // handle re-sizing of the text area

  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      const updateHeight = () => {
        const isSmallDevice = window.innerWidth < 1024; // Adjust the breakpoint as needed

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

  const interactionsRef = useRef<HTMLDivElement | null>(null);

  const hideSuggestions = () => {
    setShowSuggestions(false);
    setAssistantIconIndex(0);
  };

  // Update selected persona
  const updateCurrentPersona = (persona: Persona) => {
    onSetSelectedAssistant(persona.id == selectedAssistant.id ? null : persona);
    hideSuggestions();
    setMessage("");
  };

  // Click out of assistant suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        (!interactionsRef.current ||
          !interactionsRef.current.contains(event.target as Node))
      ) {
        hideSuggestions();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Complete user input handling
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setMessage(text);

    if (!text.startsWith("@")) {
      hideSuggestions();
      return;
    }

    // If looking for an assistant...fup
    const match = text.match(/(?:\s|^)@(\w*)$/);
    if (match) {
      setShowSuggestions(true);
    } else {
      hideSuggestions();
    }
  };

  const filteredPersonas = personas.filter((persona) =>
    persona.name.toLowerCase().startsWith(
      message
        .slice(message.lastIndexOf("@") + 1)
        .split(/\s/)[0]
        .toLowerCase()
    )
  );

  const [assistantIconIndex, setAssistantIconIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      showSuggestions &&
      filteredPersonas.length > 0 &&
      (e.key === "Tab" || e.key == "Enter")
    ) {
      e.preventDefault();
      if (assistantIconIndex == filteredPersonas.length) {
        window.open("/assistants/new", "_blank");
        hideSuggestions();
        setMessage("");
      } else {
        const option =
          filteredPersonas[assistantIconIndex >= 0 ? assistantIconIndex : 0];
        updateCurrentPersona(option);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAssistantIconIndex((assistantIconIndex) =>
        Math.min(assistantIconIndex + 1, filteredPersonas.length)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAssistantIconIndex((assistantIconIndex) =>
        Math.max(assistantIconIndex - 1, 0)
      );
    }
  };

  const [isShowing, setIsShowing] = useState(false);

  const handleShowTools = () => {
    setIsShowing(!isShowing);
  };

  return (
    <div>
      <div className="flex justify-center items-center max-w-screen-lg pb-2 mx-auto mb-2 px-5 2xl:px-0">
        <div
          className={`flex md:hidden items-center trasition-[width] ease-in-out duration-500 ${
            isShowing ? "w-[200px]" : "w-10"
          }`}
        >
          <CirclePlus
            size={24}
            className="mr-4 min-w-6"
            onClick={handleShowTools}
          />
          <Cpu
            size={24}
            onClick={() => setConfigModalActiveTab("assistants")}
            className="mr-4"
          />
          <Paperclip
            size={24}
            className="mr-4"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true; // Allow multiple files
              input.onchange = (event: any) => {
                const files = Array.from(event?.target?.files || []) as File[];
                if (files.length > 0) {
                  handleFileUpload(files);
                }
              };
              input.click();
            }}
          />
          <ImagePlus size={24} className="mr-4" />
          <Mic size={24} className="mr-4" />
        </div>
        <div className="relative w-full mx-auto shrink 2xl:w-searchbar 3xl:px-0">
          {showSuggestions && filteredPersonas.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute inset-x-0 top-0 w-full text-sm transform -translate-y-full"
            >
              <div className="py-1.5 bg-background border border-border-medium overflow-hidden shadow-lg mx-2 px-1.5 mt-2 rounded z-10">
                {filteredPersonas.map((currentPersona, index) => (
                  <button
                    key={index}
                    className={`px-2 ${
                      assistantIconIndex == index && "bg-hover"
                    } rounded content-start flex gap-x-1 py-1.5 w-full  hover:bg-hover cursor-pointer`}
                    onClick={() => {
                      updateCurrentPersona(currentPersona);
                    }}
                  >
                    <p className="font-bold ">{currentPersona.name}</p>
                    <p className="line-clamp-1">
                      {currentPersona.id == selectedAssistant.id &&
                        "(default) "}
                      {currentPersona.description}
                    </p>
                  </button>
                ))}
                <a
                  key={filteredPersonas.length}
                  target="_blank"
                  className={`${
                    assistantIconIndex == filteredPersonas.length && "bg-hover"
                  } px-3 flex gap-x-1 py-2 w-full  items-center  hover:bg-hover-light cursor-pointer"`}
                  href="/assistants/new"
                >
                  <Plus size={17} />
                  <p>Create a new assistant</p>
                </a>
              </div>
            </div>
          )}

          <Button
            onClick={() => {
              if (!isStreaming) {
                if (message) {
                  onSubmit();
                }
              } else {
                setIsCancelled(true);
              }
            }}
            className="absolute right-3 bottom-[9px] rounded-full w-8 h-8 md:hidden"
            size="xs"
          >
            <Send size={16} />
          </Button>

          <div
            className="
                opacity-100
                w-full
                h-fit
                flex
                flex-col
                border
                border-input-colored
                rounded-xl
                overflow-hidden
                bg-background
                [&:has(textarea:focus)]::ring-1
                [&:has(textarea:focus)]::ring-black
                shadow-sm
                px-4
                lg:px-6
              "
          >
            {alternativeAssistant && (
              <div className="flex flex-wrap gap-y-1 gap-x-2 px-2 pt-1.5 w-full">
                <div
                  ref={interactionsRef}
                  className="flex items-center w-full p-2 rounded-t-lg bg-background-subtle"
                >
                  <AssistantIcon assistant={alternativeAssistant} border />
                  <p className="my-auto ml-3 text-strong">
                    {alternativeAssistant.name}
                  </p>
                  <div className="flex ml-auto gap-x-1 ">
                    <Tooltip
                      content={
                        <p className="flex flex-wrap max-w-xs">
                          {alternativeAssistant.description}
                        </p>
                      }
                    >
                      <Button variant="ghost" size="xs">
                        <Info size={16} />
                      </Button>
                    </Tooltip>

                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onSetSelectedAssistant(null)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="flex flex-wrap px-2 pt-2 gap-y-1 gap-x-2">
                {files.map((file) => (
                  <div key={file.id}>
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
                  </div>
                ))}
              </div>
            )}

            <Textarea
              onPaste={handlePaste}
              onKeyDownCapture={handleKeyDown}
              onChange={handleInputChange}
              ref={textAreaRef}
              className={`
                  m-0
                  p-0
                  focus-visible:!ring-0
                  focus-visible:!ring-offset-0
                  text-base
                  w-full
                  shrink
                  resize-none
                  border-0
                  h-12
                  xl:h-28
                  py-3
                  xl:py-6
                  pr-10
                  ${
                    textAreaRef.current &&
                    textAreaRef.current.scrollHeight > MAX_INPUT_HEIGHT
                      ? "!overflow-y-auto mt-2"
                      : ""
                  }
                  overflow-hidden
                  whitespace-normal
                  break-word
                  overscroll-contain
                  outline-none
                  placeholder-subtle
                  resize-none
                  placeholder:text-nowrap
                  placeholder:text-ellipsis
                  placeholder:whitespace-nowrap
                `}
              style={{ scrollbarWidth: "thin" }}
              role="textarea"
              aria-multiline
              placeholder="How can I help you?"
              value={message}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  message &&
                  !isStreaming
                ) {
                  onSubmit();
                  event.preventDefault();
                }
              }}
              suppressContentEditableWarning={true}
            />
            <div className="hidden md:flex items-center justify-between py-5 overflow-hidden border-t border-border-light">
              <div className="flex w-auto items-center">
                <Button
                  onClick={() => setConfigModalActiveTab("assistants")}
                  variant="outline"
                  className="mr-2"
                >
                  <Cpu size={16} />
                  My Assistants
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
                  <Paperclip size={20} className="text-primary" />
                </Button>

                <Button variant="ghost">
                  <ImagePlus size={20} className="text-primary" />
                </Button>

                <Button variant="ghost">
                  <Mic size={20} className="text-primary" />
                </Button>
              </div>
              <div>
                <Button
                  onClick={() => {
                    if (!isStreaming) {
                      if (message) {
                        onSubmit();
                      }
                    } else {
                      setIsCancelled(true);
                    }
                  }}
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
