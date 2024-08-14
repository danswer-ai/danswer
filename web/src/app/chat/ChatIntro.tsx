import { getSourceMetadataForSources } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import { Persona } from "../admin/assistants/interfaces";
import { HoverPopup } from "@/components/HoverPopup";
import { useState } from "react";
import { LuChevronsLeftRight } from "react-icons/lu";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Info } from "lucide-react";

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
      <div className="flex justify-center w-full py-20">
        <div className="max-w-screen-lg 2xl:w-searchbar px-5 2xl:px-0 pt-10 md:pt-16 lg:pt-0 xl:pt-16">
          <div className="flex">
            <div>
              <h1 className="flex flex-col text-[2rem] md:text-[3rem] 2xl:text-[4rem] font-medium leading-[1.2] tracking-tighter">
                <span className="h1-bg">Hi, I&rsquo;am enMedD AI,</span>
                <span className="h1-bg">How can I help you today?</span>
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
                                <Bookmark />
                              </div>
                              {documentSet.name}
                            </span>
                          }
                          popupContent={
                            <div className="flex py-1 w-96">
                              <Info className="my-auto mr-2" />
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
                  <p className="mt-4 mb-1 font-bold text-dark-900">
                    Connected Sources:{" "}
                  </p>
                  <div className={`flex flex-wrap gap-2`}>
                    {availableSourceMetadata.map((sourceMetadata) => (
                      <Badge
                        key={sourceMetadata.internalName}
                        variant="secondary"
                      >
                        {sourceMetadata.icon({})}
                        {sourceMetadata.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
