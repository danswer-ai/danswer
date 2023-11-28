import { Persona } from "@/app/admin/personas/interfaces";
import { CustomDropdown } from "../Dropdown";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { FaRobot } from "react-icons/fa";

function PersonaItem({
  id,
  name,
  onSelect,
  isSelected,
  isFinal,
}: {
  id: number;
  name: string;
  onSelect: (personaId: number) => void;
  isSelected: boolean;
  isFinal: boolean;
}) {
  return (
    <div
      key={id}
      className={`
    flex
    px-3 
    text-sm 
    text-gray-200 
    py-2.5 
    select-none 
    cursor-pointer 
    ${isFinal ? "" : "border-b border-gray-800"} 
    ${
      isSelected
        ? "bg-dark-tremor-background-muted"
        : "hover:bg-dark-tremor-background-muted "
    }
  `}
      onClick={() => {
        onSelect(id);
      }}
    >
      {name}
      {isSelected && (
        <div className="ml-auto mr-1">
          <FiCheck />
        </div>
      )}
    </div>
  );
}

export function PersonaSelector({
  personas,
  selectedPersonaId,
  onPersonaChange,
}: {
  personas: Persona[];
  selectedPersonaId: number | null;
  onPersonaChange: (persona: Persona | null) => void;
}) {
  const currentlySelectedPersona = personas.find(
    (persona) => persona.id === selectedPersonaId
  );

  return (
    <CustomDropdown
      dropdown={
        <div
          className={`
            border 
            border-gray-800 
            rounded-lg 
            flex 
            flex-col 
            w-64 
            max-h-96 
            overflow-y-auto 
            flex
            overscroll-contain`}
        >
          <PersonaItem
            key={-1}
            id={-1}
            name="Default"
            onSelect={() => {
              onPersonaChange(null);
            }}
            isSelected={selectedPersonaId === null}
            isFinal={false}
          />
          {personas.map((persona, ind) => {
            const isSelected = persona.id === selectedPersonaId;
            return (
              <PersonaItem
                key={persona.id}
                id={persona.id}
                name={persona.name}
                onSelect={(clickedPersonaId) => {
                  const clickedPersona = personas.find(
                    (persona) => persona.id === clickedPersonaId
                  );
                  if (clickedPersona) {
                    onPersonaChange(clickedPersona);
                  }
                }}
                isSelected={isSelected}
                isFinal={ind === personas.length - 1}
              />
            );
          })}
        </div>
      }
    >
      <div className="select-none text-sm flex text-gray-300 px-1 py-1.5 cursor-pointer w-64">
        <FaRobot className="my-auto mr-2" />
        {currentlySelectedPersona?.name || "Default"}{" "}
        <FiChevronDown className="my-auto ml-2" />
      </div>
    </CustomDropdown>
  );
}
