import { getSourceMetadataForSources } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import { Persona } from "../admin/assistants/interfaces";
import { Divider } from "@tremor/react";
import { FiBookmark, FiInfo } from "react-icons/fi";
import { HoverPopup } from "@/components/HoverPopup";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";
import { useState } from "react";
import { DisplayAssistantCard } from "@/components/assistants/AssistantCards";

export function ChatIntro({
  availableSources,
  selectedPersona,
}: {
  availableSources: ValidSources[];
  selectedPersona: Persona;
}) {
  const [hoveredAssistant, setHoveredAssistant] = useState(false);
  const availableSourceMetadata = getSourceMetadataForSources(availableSources);

  return (
    <>
      <div className="mobile:w-[90%] mobile:px-4 w-message-xs 2xl:w-message-sm 3xl:w-message">
        <div className="flex">
          <div className="mx-auto flex justify-center items-center flex-col gap-y-4">
            <div className="m-auto text-3xl text-text-800 font-base font-semibold text-strong w-fit">
              {selectedPersona?.name || "How can I help you today?"}
            </div>
            <div className="relative">
              <div
                onMouseEnter={() => setHoveredAssistant(true)}
                onMouseLeave={() => setHoveredAssistant(false)}
                className="p-4 cursor-pointer border-dashed rounded-full flex border border-border border-2 border-dashed"
                style={{
                  borderStyle: "dashed",
                  borderWidth: "1.5px",
                  borderSpacing: "4px",
                }}
              >
                <AssistantIcon
                  disableToolip
                  size={"large"}
                  assistant={selectedPersona}
                />
              </div>
              <div className="absolute  z-10 left-full ml-4 w-[300px] top-0">
                {hoveredAssistant && (
                  <DisplayAssistantCard selectedPersona={selectedPersona} />
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedPersona && selectedPersona.num_chunks !== 0 && (
          <>
            <Divider />
            <div>
              {selectedPersona.document_sets.length > 0 && (
                <div className="mt-2">
                  <p className="font-bold mb-1 mt-4 text-emphasis">
                    Knowledge Sets:{" "}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.document_sets.map((documentSet) => (
                      <div key={documentSet.id} className="w-fit">
                        <HoverPopup
                          mainContent={
                            <span className="flex w-fit p-1 rounded border border-border text-xs font-medium cursor-default">
                              <div className="mr-1 my-auto">
                                <FiBookmark />
                              </div>
                              {documentSet.name}
                            </span>
                          }
                          popupContent={
                            <div className="flex py-1 w-96">
                              <FiInfo className="my-auto mr-2" />
                              <div className="text-sm">
                                {documentSet.description}
                              </div>
                            </div>
                          }
                          direction="top"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableSources.length > 0 && (
                <div className="mt-1">
                  <p className="font-bold mb-1 mt-4 text-emphasis">
                    Connected Sources:{" "}
                  </p>
                  <div className={`flex flex-wrap gap-2`}>
                    {availableSourceMetadata.map((sourceMetadata) => (
                      <span
                        key={sourceMetadata.internalName}
                        className="flex w-fit p-1 rounded border border-border text-xs font-medium cursor-default"
                      >
                        <div className="mr-1 my-auto">
                          {sourceMetadata.icon({})}
                        </div>
                        <div className="my-auto">
                          {sourceMetadata.displayName}
                        </div>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
