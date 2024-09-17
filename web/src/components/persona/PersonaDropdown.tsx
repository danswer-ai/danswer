import { type FC, useEffect, useMemo, useState } from "react";
import { Label, SubLabel } from "../admin/connectors/Field";
import { SearchMultiSelectDropdown } from "../Dropdown";
import { Persona } from "@/app/admin/assistants/interfaces";
import { FiX } from "react-icons/fi";
import { useField, useFormikContext } from "formik";

interface PersonaSearchMultiSelectDropdownFieldProps {
  name: string;
  label: string;
  subtext: string;
  existingPersonas: Persona[];
  selectedPersonas: Persona[];
}

export const PersonaSearchMultiSelectDropdownField: FC<
  PersonaSearchMultiSelectDropdownFieldProps
> = ({ name, label, subtext, existingPersonas }) => {
  const [field] = useField<Persona[]>(name);
  const { setFieldValue } = useFormikContext();

  const personaIdMap = useMemo(
    () =>
      Object.fromEntries(
        existingPersonas.map((persona) => [persona.id, persona])
      ),
    [existingPersonas]
  );

  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>(
    field.value
  );

  const handleSelectPersona = (toAdd: Persona) => {
    setSelectedPersonas((selected) => [...selected, toAdd]);
  };

  const handleDeselectPersona = (toRemove: Persona) => {
    setSelectedPersonas((selected) =>
      selected.filter((persona) => persona.id != toRemove.id)
    );
  };

  useEffect(() => {
    setFieldValue(name, selectedPersonas);
  }, [selectedPersonas]);

  useEffect(() => {
    setSelectedPersonas(field.value);
  }, [existingPersonas]);

  return (
    <div className="flex flex-col mb-4">
      <Label>{label}</Label>
      <SubLabel>{subtext}</SubLabel>
      <div className="mb-2 flex flex-wrap gap-x-2">
        {selectedPersonas.length > 0 &&
          selectedPersonas.map((persona) => (
            <div
              key={persona.id}
              onClick={() => {
                handleDeselectPersona(persona);
              }}
              className={`
                  flex 
                  rounded-lg 
                  px-2 
                  py-1 
                  border 
                  border-border 
                  hover:bg-hover-light 
                  cursor-pointer`}
            >
              {persona.name} <FiX className="ml-1 my-auto" />
            </div>
          ))}
      </div>
      <SearchMultiSelectDropdown
        options={existingPersonas.map((persona) => {
          return {
            value: persona.id,
            name: persona.name,
          };
        })}
        onSelect={(option) => {
          handleSelectPersona(personaIdMap[option.value]);
        }}
      />
    </div>
  );
};
