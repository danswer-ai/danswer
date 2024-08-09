/* import { getSourceMetadataForSources, listSourceMetadata } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import Image from "next/image";
import { Persona } from "../admin/assistants/interfaces";
import { Divider } from "@tremor/react";
import { FiBookmark, FiCpu, FiInfo, FiX, FiZoomIn } from "react-icons/fi";
import { HoverPopup } from "@/components/HoverPopup";
import { Modal } from "@/components/Modal";
import { useState } from "react";
import { Logo } from "@/components/Logo";

const MAX_PERSONAS_TO_DISPLAY = 4;

function HelperItemDisplay({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-4 py-2 border rounded cursor-pointer hover:bg-hover-light border-border">
      <div className="flex text-lg font-bold text-emphasis">{title}</div>
      <div className="text-sm">{description}</div>
    </div>
  );
}

export function ChatIntro({
  availableSources,
  selectedPersona,
}: {
  availableSources: ValidSources[];
  selectedPersona: Persona;
}) {
  const availableSourceMetadata = getSourceMetadataForSources(availableSources);

  const [displaySources, setDisplaySources] = useState(false);

  return (
    <>
      <div className="flex items-center justify-center h-full">
        <div className="w-message-xs 2xl:w-message-sm 3xl:w-message">
          <div className="flex">
            <div className="mx-auto">
              <Logo height={80} width={80} className="m-auto" />

              <div className="m-auto mt-4 text-3xl font-bold text-strong w-fit">
                {selectedPersona?.name || "How can I help you today?"}
              </div>
              {selectedPersona && (
                <div className="px-6 mt-1 text-center">
                  {selectedPersona.description}
                </div>
              )}
            </div>
          </div>

          {selectedPersona && selectedPersona.num_chunks !== 0 && (
            <>
              <Divider />
              <div>
                {selectedPersona.document_sets.length > 0 && (
                  <div className="mt-2">
                    <p className="mt-4 mb-1 font-bold text-emphasis">
                      Knowledge Sets:{" "}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPersona.document_sets.map((documentSet) => (
                        <div key={documentSet.id} className="w-fit">
                          <HoverPopup
                            mainContent={
                              <span className="flex p-1 text-xs font-medium border rounded cursor-default w-fit border-border">
                                <div className="my-auto mr-1">
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
                    <p className="mt-4 mb-1 font-bold text-emphasis">
                      Connected Sources:{" "}
                    </p>
                    <div className={`flex flex-wrap gap-2`}>
                      {availableSourceMetadata.map((sourceMetadata) => (
                        <span
                          key={sourceMetadata.internalName}
                          className="flex p-1 text-xs font-medium border rounded cursor-default w-fit border-border"
                        >
                          <div className="my-auto mr-1">
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
      </div>
    </>
  );
} */
import { getSourceMetadataForSources, listSourceMetadata } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import Image from "next/image";
import { Persona } from "../admin/assistants/interfaces";
import { Divider } from "@tremor/react";
import { FiBookmark, FiCpu, FiInfo, FiX, FiZoomIn } from "react-icons/fi";
import { HoverPopup } from "@/components/HoverPopup";
import { Modal } from "@/components/Modal";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { LuChevronsLeftRight } from "react-icons/lu";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MAX_PERSONAS_TO_DISPLAY = 4;

function HelperItemDisplay({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-4 py-2 border rounded cursor-pointer hover:bg-hover-light border-border">
      <div className="flex text-lg font-bold text-emphasis">{title}</div>
      <div className="text-sm">{description}</div>
    </div>
  );
}

export function ChatIntro({
  availableSources,
  selectedPersona,
}: {
  availableSources: ValidSources[];
  selectedPersona: Persona;
}) {
  const availableSourceMetadata = getSourceMetadataForSources(availableSources);

  const [displaySources, setDisplaySources] = useState(false);

  return (
    <>
      <div className="flex justify-center w-full pt-20">
        <div className="2xl:w-searchbar-sm 3xl:w-searchbar px-6 xl:px-0">
          <div className="flex pt-10 xl:pt-16">
            <div>
              {/*  <Logo height={80} width={80} className="m-auto" /> */}

              <h1 className="flex flex-col text-[2rem] md:text-[3rem] lg:text-[44px] xl:text-[4rem] font-semibold h1-bg leading-[1.3]">
                <span>Hi, I&rsquo;am enMedD AI,</span>
                <span>How can I help you today?</span>
              </h1>
              {/* <div className="m-auto mt-4 text-3xl font-bold text-strong w-fit">
                {selectedPersona?.name || "How can I help you today?"}
              </div>
              {selectedPersona && (
                <div className="px-6 mt-1 text-center">
                  {selectedPersona.description}
                </div>
              )} */}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10">
            <Card className="h-[180px] p-4 justify-between md:flex flex-col cursor-pointer border-input-colored hidden">
              <CardContent className="p-0 text-default">
                How can I optimize this code for better performance?
              </CardContent>
              <CardFooter className="p-0">
                <LuChevronsLeftRight size={24} className="ml-auto" />
              </CardFooter>
            </Card>
            <Card className="h-[180px] p-4 justify-between md:flex flex-col cursor-pointer border-input-colored hidden">
              <CardContent className="p-0 text-default">
                How can I optimize this code for better performance?
              </CardContent>
              <CardFooter className="p-0">
                <LuChevronsLeftRight size={24} className="ml-auto" />
              </CardFooter>
            </Card>
            <Card className="h-[180px] p-4 justify-between flex flex-col cursor-pointer border-input-colored">
              <CardContent className="p-0 text-default">
                How can I optimize this code for better performance?
              </CardContent>
              <CardFooter className="p-0">
                <LuChevronsLeftRight size={24} className="ml-auto" />
              </CardFooter>
            </Card>
            <Card className="h-[180px] p-4 justify-between flex flex-col cursor-pointer border-input-colored">
              <CardContent className="p-0 text-default">
                How can I optimize this code for better performance?
              </CardContent>
              <CardFooter className="p-0">
                <LuChevronsLeftRight size={24} className="ml-auto" />
              </CardFooter>
            </Card>
          </div>

          {selectedPersona && selectedPersona.num_chunks !== 0 && (
            <div className="pt-4">
              {selectedPersona.document_sets.length > 0 && (
                <div className="mt-2">
                  <p className="mt-4 mb-1 font-bold text-emphasis">
                    Knowledge Sets:{" "}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPersona.document_sets.map((documentSet) => (
                      <div key={documentSet.id} className="w-fit">
                        <HoverPopup
                          mainContent={
                            <span className="flex p-1 text-xs font-medium border rounded cursor-default w-fit border-border">
                              <div className="my-auto mr-1">
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
                  <p className="mt-4 mb-1 font-bold text-emphasis">
                    Connected Sources:{" "}
                  </p>
                  <div className={`flex flex-wrap gap-2`}>
                    {availableSourceMetadata.map((sourceMetadata) => (
                      <Badge
                        key={sourceMetadata.internalName}
                        variant="secondary"
                      >
                        <div className="my-auto mr-1">
                          {sourceMetadata.icon({})}
                        </div>
                        <div className="my-auto">
                          {sourceMetadata.displayName}
                        </div>
                      </Badge>
                    ))}
                  </div>
                  {/* <div className={`flex flex-wrap gap-2`}>
                    {availableSourceMetadata.map((sourceMetadata) => (
                      <span
                        key={sourceMetadata.internalName}
                        className="flex p-1 text-xs font-medium border rounded cursor-default w-fit border-border"
                      >
                        <div className="my-auto mr-1">
                          {sourceMetadata.icon({})}
                        </div>
                        <div className="my-auto">
                          {sourceMetadata.displayName}
                        </div>
                      </span>
                    ))}
                  </div> */}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
