import { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";
import { useAssistants } from "@/components/context/AssistantsContext";
import { Persona } from "@/app/admin/assistants/interfaces";

const AssistantSelector = ({
  liveAssistant,
  onAssistantChange,
}: {
  liveAssistant: Persona;
  onAssistantChange: (assistant: Persona) => void;
}) => {
  const { finalAssistants } = useAssistants();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label={`Assistant selector, current assistant is ${liveAssistant.name}`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex cursor-pointer items-center gap-1 rounded-lg py-1.5 px-3 text-lg hover:bg-background-200 font-semibold text-text-secondary overflow-hidden whitespace-nowrap"
      >
        <div className="text-text-secondary">
          {liveAssistant.name}{" "}
          <span className="text-text-secondary">{liveAssistant.id}</span>
        </div>
        <FiChevronDown className="text-text-tertiary" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full rounded-md bg-background-100 shadow-lg">
          {finalAssistants.map((assistant) => (
            <div
              key={assistant.id}
              className="px-4 py-2 hover:bg-background-200 cursor-pointer"
              onClick={() => {
                onAssistantChange(assistant);
                setIsOpen(false);
              }}
            >
              {assistant.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssistantSelector;
