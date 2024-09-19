"use client";

import { Persona } from "@/app/admin/assistants/interfaces";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { User } from "@/lib/types";
import { Button } from "@tremor/react";
import Link from "next/link";
import { useState } from "react";
import { FiList, FiMinus, FiPlus, FiX } from "react-icons/fi";
import { NavigationButton } from "../NavigationButton";
import { AssistantsPageTitle } from "../AssistantsPageTitle";
import {
  addAssistantToList,
  removeAssistantFromList,
} from "@/lib/assistants/updateAssistantPreferences";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { AssistantTools, ToolsDisplay } from "../ToolsDisplay";

export function AssistantsGallery({
  assistants,
  user,
}: {
  assistants: Persona[];

  user: User | null;
}) {
  function filterAssistants(assistants: Persona[], query: string): Persona[] {
    return assistants.filter(
      (assistant) =>
        assistant.name.toLowerCase().includes(query.toLowerCase()) ||
        assistant.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const { popup, setPopup } = usePopup();

  const allAssistantIds = assistants.map((assistant) => assistant.id);
  const filteredAssistants = filterAssistants(assistants, searchQuery);

  return (
    <>
      {popup}
      <div className="mx-auto w-searchbar-xs 2xl:w-searchbar-sm 3xl:w-searchbar">
        <AssistantsPageTitle>Assistant Gallery</AssistantsPageTitle>

        <div className="grid grid-cols-2 gap-4 mt-4 mb-6">
          <Link href="/assistants/new">
            <Button
              className="w-full py-3 text-lg rounded-full bg-background-800 text-white hover:bg-background-800 transition duration-300 ease-in-out"
              icon={FiPlus}
            >
              Create New Assistant
            </Button>
          </Link>
          <Link href="/assistants/gallery">
            <Button
              className="w-full hover:border-border-strong py-3 text-lg rounded-full bg-white border border-border shadow text-text-700 hover:bg-background-50 transition duration-300 ease-in-out"
              icon={FiList}
            >
              Your Assistants
            </Button>
          </Link>
        </div>

        <p className="text-center text-text-500 text-lg mb-6">
          Discover and create custom assistants that combine instructions, extra
          knowledge, and any combination of tools.
        </p>

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search assistants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full
                py-3
                px-4
                pl-10
                text-lg
                border-2
                border-background-strong
                rounded-full
                bg-background-50
                text-text-700
                placeholder-text-400
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
                focus:border-transparent
                transition duration-300 ease-in-out
              "
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-text-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
        <div
          className="
          w-full
          grid
          grid-cols-2
          gap-4
          py-2
        "
        >
          {filteredAssistants.map((assistant) => (
            <div
              key={assistant.id}
              className="
              bg-background-emphasis
              rounded-lg
              shadow-md
              p-4
            "
            >
              <div className="flex items-center">
                <AssistantIcon assistant={assistant} />
                <h2
                  className="
                  text-xl
                  font-semibold
                  my-auto
                  ml-2
                  text-strong
                  line-clamp-2
                "
                >
                  {assistant.name}
                </h2>
                {user && (
                  <div className="ml-auto">
                    {!user.preferences?.chosen_assistants ||
                    user.preferences?.chosen_assistants?.includes(
                      assistant.id
                    ) ? (
                      <Button
                        className="
                          mr-2
                          my-auto
                          bg-background-700
                          hover:bg-background-600
                        "
                        icon={FiMinus}
                        onClick={async () => {
                          if (
                            user.preferences?.chosen_assistants &&
                            user.preferences?.chosen_assistants.length === 1
                          ) {
                            setPopup({
                              message: `Cannot remove "${assistant.name}" - you must have at least one assistant.`,
                              type: "error",
                            });
                            return;
                          }

                          const success = await removeAssistantFromList(
                            assistant.id,
                            user.preferences?.chosen_assistants ||
                              allAssistantIds
                          );
                          if (success) {
                            setPopup({
                              message: `"${assistant.name}" has been removed from your list.`,
                              type: "success",
                            });
                            router.refresh();
                          } else {
                            setPopup({
                              message: `"${assistant.name}" could not be removed from your list.`,
                              type: "error",
                            });
                          }
                        }}
                        size="xs"
                      >
                        Deselect
                      </Button>
                    ) : (
                      <Button
                        className="
                          mr-2
                          my-auto
                          bg-accent
                          hover:bg-accent-hover
                        "
                        icon={FiPlus}
                        onClick={async () => {
                          const success = await addAssistantToList(
                            assistant.id,
                            user.preferences?.chosen_assistants ||
                              allAssistantIds
                          );
                          if (success) {
                            setPopup({
                              message: `"${assistant.name}" has been added to your list.`,
                              type: "success",
                            });
                            router.refresh();
                          } else {
                            setPopup({
                              message: `"${assistant.name}" could not be added to your list.`,
                              type: "error",
                            });
                          }
                        }}
                        size="xs"
                        color="green"
                      >
                        Add
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm mt-2">{assistant.description}</p>
              <p className="text-subtle text-sm my-2">
                Author: {assistant.owner?.email || "Danswer"}
              </p>
              {assistant.tools.length > 0 && (
                <AssistantTools list assistant={assistant} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
