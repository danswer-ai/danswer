"use client";

import { Divider, Text } from "@tremor/react";
import { Persona } from "./interfaces";
import { EditButton } from "@/components/EditButton";
import { useRouter } from "next/navigation";
import { CustomCheckbox } from "@/components/CustomCheckbox";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { UniqueIdentifier } from "@dnd-kit/core";
import { DraggableTable } from "@/components/table/DraggableTable";
import { personaComparator } from "./lib";

export function PersonasTable({ personas }: { personas: Persona[] }) {
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  const sortedPersonas = [...personas];
  sortedPersonas.sort(personaComparator);

  const [finalPersonas, setFinalPersonas] = useState<UniqueIdentifier[]>(
    sortedPersonas.map((persona) => persona.id.toString())
  );
  const finalPersonaValues = finalPersonas.map((id) => {
    return sortedPersonas.find(
      (persona) => persona.id.toString() === id
    ) as Persona;
  });

  const updatePersonaOrder = async (orderedPersonaIds: UniqueIdentifier[]) => {
    setFinalPersonas(orderedPersonaIds);

    const displayPriorityMap = new Map<UniqueIdentifier, number>();
    orderedPersonaIds.forEach((personaId, ind) => {
      displayPriorityMap.set(personaId, ind);
    });

    const response = await fetch("/api/admin/persona/display-priority", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_priority_map: Object.fromEntries(displayPriorityMap),
      }),
    });
    if (!response.ok) {
      setPopup({
        type: "error",
        message: `Failed to update persona order - ${await response.text()}`,
      });
      router.refresh();
    }
  };

  return (
    <div>
      {popup}

      <Text className="my-2">
        Personas will be displayed as options on the Chat / Search interfaces in
        the order they are displayed below. Personas marked as hidden will not
        be displayed.
      </Text>

      <DraggableTable
        headers={["Name", "Description", "Built-In", "Is Visible", ""]}
        rows={finalPersonaValues.map((persona) => {
          return {
            id: persona.id.toString(),
            cells: [
              <p
                key="name"
                className="text font-medium whitespace-normal break-none"
              >
                {persona.name}
              </p>,
              <p
                key="description"
                className="whitespace-normal break-all max-w-2xl"
              >
                {persona.description}
              </p>,
              persona.default_persona ? "Yes" : "No",
              <div
                key="is_visible"
                onClick={async () => {
                  const response = await fetch(
                    `/api/admin/persona/${persona.id}/visible`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        is_visible: !persona.is_visible,
                      }),
                    }
                  );
                  if (response.ok) {
                    router.refresh();
                  } else {
                    setPopup({
                      type: "error",
                      message: `Failed to update persona - ${await response.text()}`,
                    });
                  }
                }}
                className="px-1 py-0.5 hover:bg-hover-light rounded flex cursor-pointer select-none w-fit"
              >
                <div className="my-auto w-12">
                  {!persona.is_visible ? (
                    <div className="text-error">Hidden</div>
                  ) : (
                    "Visible"
                  )}
                </div>
                <div className="ml-1 my-auto">
                  <CustomCheckbox checked={persona.is_visible} />
                </div>
              </div>,
              <div key="edit" className="flex">
                <div className="mx-auto">
                  {!persona.default_persona ? (
                    <EditButton
                      onClick={() =>
                        router.push(`/admin/personas/${persona.id}`)
                      }
                    />
                  ) : (
                    "-"
                  )}
                </div>
              </div>,
            ],
            staticModifiers: [[1, "lg:w-[300px] xl:w-[400px] 2xl:w-[550px]"]],
          };
        })}
        setRows={updatePersonaOrder}
      />
    </div>
  );
}
