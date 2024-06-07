
 
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { FiSend, FiFilter, FiPlusCircle, FiCpu, FiX } from "react-icons/fi";
import ChatInputOption from "./ChatInputOption";
import { FaBrain } from "react-icons/fa";
import { Persona } from "@/app/admin/assistants/interfaces";
import { FilterManager, LlmOverride, LlmOverrideManager } from "@/lib/hooks";
import { SelectedFilterDisplay } from "./SelectedFilterDisplay";
import { useChatContext } from "@/components/context/ChatContext";
import { getFinalLLM } from "@/lib/llm/utils";
import { FileDescriptor } from "../interfaces";
import { InputBarPreview } from "../files/InputBarPreview";
import { RobotIcon } from "@/components/icons/icons";
import { Hoverable } from "@/components/Hoverable";

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
  setSelectedAlternativeAssistant,
  selectedAssistant,
  files,
  setFiles,
  handleFileUpload,
  setConfigModalActiveTab,
  textAreaRef,
  alternativeAssistant,
  updateAlternativeAssistant,
}: {
  setSelectedAlternativeAssistant: Dispatch<SetStateAction<Persona | null>>;
  personas: Persona[];
  updateAlternativeAssistant: (newAlternativeAssistant: Persona | null) => void;
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
      textarea.style.height = "0px";
      textarea.style.height = `${Math.min(
        textarea.scrollHeight,
        MAX_INPUT_HEIGHT
      )}px`;
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Store the timeout reference
  const contentRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // console.log("HI");
      if (suggestionsRef.current) {
        if (!suggestionsRef.current.contains(event.target as Node)) {
          // Clear any existing timeout to avoid unwanted behavior
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          // Set a delay before setting 'showSuggestions' to false
          timeoutRef.current = setTimeout(() => {
            setShowSuggestions(false);
          }, 100);
        } else {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            setShowSuggestions(false);
          }, 100);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Make sure to clear the timeout when the component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setMessage(text);

    const match = text.match(/@(\w*)$/);
    if (match) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const filteredPersonas = personas.filter((persona) =>
    persona.name
      .toLowerCase()
      .startsWith(message.slice(message.lastIndexOf("@") + 1).toLowerCase())
  );
  const updateCurrentPersona = (persona: Persona) => {
    setSelectedAlternativeAssistant(persona);
    setShowSuggestions(false);
    setMessage("");
  };

  return (
    <div>
      <div className="flex justify-center pb-2 max-w-screen-lg mx-auto mb-2">
        <div
          className="
            w-full
            shrink
            relative
            px-4
            w-searchbar-xs
            2xl:w-searchbar-sm
            3xl:w-searchbar
            mx-auto
          "
        >
          {showSuggestions && filteredPersonas.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute inset-x-0 top-0 w-full transform -translate-y-full "
            >
              <div className="rounded-lg bg-white border border-gray-300 overflow-hidden shadow-lg mx-2 mt-2 rounded  z-10">
                {filteredPersonas.map((currentPersona, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      console.log("ZZZ");
                      updateCurrentPersona(currentPersona);
                    }}
                  >
                    {currentPersona.name}
                  </div>
                ))}
              </div>
            </div>
          )}

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
              border
              border-border-medium
              rounded-lg
              overflow-hidden
              bg-background-weak
              [&:has(textarea:focus)]::ring-1
              [&:has(textarea:focus)]::ring-black
            "
          >
            {alternativeAssistant && (
              <div className="flex flex-wrap gap-y-1 gap-x-2 px-2 pt-1.5 w-full  ">
                <div className="bg-neutral-200 p-2 rounded-t-lg  items-center flex w-full">
                  <RobotIcon size={20} />
                  <p className="ml-3 text-neutral-800 my-auto">
                    {alternativeAssistant.name}
                  </p>
                  <div className="ml-auto ">
                    <Hoverable
                      icon={FiX}
                      onClick={() => updateAlternativeAssistant(null)}
                    />
                  </div>
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="flex flex-wrap gap-y-1 gap-x-2 px-2 pt-2">
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

            <textarea
              onPaste={handlePaste}
              ref={textAreaRef}
              className={`
                m-0
                w-full
                shrink
                resize-none
                border-0
                bg-background-weak
                ${
                  textAreaRef.current &&
                  textAreaRef.current.scrollHeight > MAX_INPUT_HEIGHT
                    ? "overflow-y-auto mt-2"
                    : ""
                }
                overflow-hidden
                whitespace-normal
                break-word
                overscroll-contain
                outline-none
                placeholder-gray-400
                overflow-hidden
                resize-none
                pl-4
                pr-12
                py-4
                h-14
              `}
              // onInput={handleKeyDown}
              autoFocus
              style={{ scrollbarWidth: "thin" }}
              role="textarea"
              aria-multiline
              placeholder="Send a message..."
              value={message}
              onChange={handleInputChange}
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
            <div className="flex items-center space-x-3 mr-12 px-4 pb-2 overflow-hidden">
              <ChatInputOption
                flexPriority="shrink"
                name={selectedAssistant ? selectedAssistant.name : "Assistants"}
                icon={FaBrain}
                onClick={() => setConfigModalActiveTab("assistants")}
              />

              <ChatInputOption
                flexPriority="second"
                name={
                  llmOverrideManager.llmOverride.modelName ||
                  (selectedAssistant
                    ? selectedAssistant.llm_model_version_override || llmName
                    : llmName)
                }
                icon={FiCpu}
                onClick={() => setConfigModalActiveTab("llms")}
              />

              {!retrievalDisabled && (
                <ChatInputOption
                  flexPriority="stiff"
                  name="Filters"
                  icon={FiFilter}
                  onClick={() => setConfigModalActiveTab("filters")}
                />
              )}

              <ChatInputOption
                flexPriority="stiff"
                name="File"
                icon={FiPlusCircle}
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
              />
            </div>
            <div className="absolute bottom-2.5 right-10">
              <div
                className="cursor-pointer"
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
                <FiSend
                  size={18}
                  className={`text-emphasis w-9 h-9 p-2 rounded-lg ${
                    message ? "bg-blue-200" : ""
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
