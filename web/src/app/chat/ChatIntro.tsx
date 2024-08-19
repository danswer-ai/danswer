import { getSourceMetadataForSources } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import { Persona } from "../admin/assistants/interfaces";
import { HoverPopup } from "@/components/HoverPopup";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Info } from "lucide-react";

export function ChatIntro({
  availableSources,
  livePersona,
  children,
}: {
  availableSources: ValidSources[];
  livePersona: Persona;
  children?: React.ReactNode;
}) {
  const availableSourceMetadata = getSourceMetadataForSources(availableSources);

  return (
    <>
      <div className="flex justify-center w-full py-20">
        <div className="max-w-full 2xl:w-searchbar px-5 2xl:px-0 pt-10 md:pt-16 lg:pt-0 2xl:pt-14">
          <div className="flex">
            <div>
              <h1 className="flex flex-col text-[2rem] md:text-[3rem] 2xl:text-[4rem] font-medium leading-[1.2] tracking-tighter">
                <span className="h1-bg">Hi, I am {livePersona?.name},</span>
                <span className="h1-bg">How can I help you today?</span>
              </h1>
              {/* <div className="m-auto mt-4 text-3xl font-bold text-strong w-fit">
                {livePersona?.name || "How can I help you today?"}
              </div>
              {livePersona && (
                <div className="px-6 mt-1 text-center">
                  {livePersona.description}
                </div>
              )} */}
            </div>
          </div>

          {children}

          {livePersona && livePersona.num_chunks !== 0 && (
            <div className="pt-4">
              {livePersona.document_sets.length > 0 && (
                <div className="mt-2">
                  <p className="mt-4 mb-1 font-bold text-emphasis">
                    Knowledge Sets:{" "}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {livePersona.document_sets.map((documentSet) => (
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
