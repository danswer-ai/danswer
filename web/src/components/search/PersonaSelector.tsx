import { Persona } from "@/app/admin/assistants/interfaces";
import { CustomDropdown, DefaultDropdownElement } from "../Dropdown";
import { FiChevronDown } from "react-icons/fi";

export function PersonaSelector({
  personas,
  selectedPersonaId,
  onPersonaChange,
}: {
  personas: Persona[];
  selectedPersonaId: number;
  onPersonaChange: (persona: Persona) => void;
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
            border-border 
            bg-background
            rounded-regular 
            flex 
            flex-col 
            w-64 
            max-h-96 
            overflow-y-auto 
            overscroll-contain`}
        >
          {personas.map((persona, ind) => {
            const isSelected = persona.id === selectedPersonaId;
            return (
              <DefaultDropdownElement
                key={persona.id}
                name={persona.name}
                onSelect={() => onPersonaChange(persona)}
                isSelected={isSelected}
              />
            );
          })}
        </div>
      }
    >
      <div className="select-none text-sm font-bold flex text-emphasis px-2 py-1.5 cursor-pointer w-fit hover:bg-hover rounded">
        {currentlySelectedPersona?.name || "Default"}
        <FiChevronDown className="my-auto ml-2" />
      </div>
    </CustomDropdown>
  );
}

/* import { Persona } from "@/app/admin/assistants/interfaces";
import { CustomDropdown, DefaultDropdownElement } from "../Dropdown";
import { FiChevronDown } from "react-icons/fi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomSelect } from "../Select";

export function PersonaSelector({
  personas,
  selectedPersonaId,
  onPersonaChange,
}: {
  personas: Persona[];
  selectedPersonaId: number;
  onPersonaChange: (persona: Persona) => void;
}) {
  const currentlySelectedPersona = personas.find(
    (persona) => persona.id === selectedPersonaId
  );

  return (
    <CustomSelect
      items={personas}
      selectedItem={currentlySelectedPersona || personas[0]}
      onItemSelect={onPersonaChange}
      getItemValue={(persona) => persona.id.toString()}
      getItemLabel={(persona) => persona.name}
      placeholder="Select a persona"
    />
  );
} */
