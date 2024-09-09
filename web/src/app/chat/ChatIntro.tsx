import { getSourceMetadataForSources } from "@/lib/sources";
import { ValidSources } from "@/lib/types";
import { Assistant } from "../admin/assistants/interfaces";
import { HoverPopup } from "@/components/HoverPopup";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Info } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";

export function ChatIntro({
  availableSources,
  liveAssistant,
  children,
}: {
  availableSources: ValidSources[];
  liveAssistant: Assistant;
  children?: React.ReactNode;
}) {
  const availableSourceMetadata = getSourceMetadataForSources(availableSources);

  return (
    <>
      <div className="flex 2xl:justify-center w-full py-20">
        <div className="max-w-full 2xl:w-searchbar px-5 2xl:px-0 mt-10 md:mt-16 lg:mt-0 2xl:mt-14">
          <div className="flex">
            <div>
              <h1 className="flex flex-col text-[2.5rem] md:text-[3.5rem] font-semibold leading-[1.2] tracking-tighter">
                <span className="h1-bg">Hi, I am {liveAssistant?.name},</span>
                <span className="h1-bg">How can I help you today?</span>
              </h1>
            </div>
          </div>

          {children}

          {liveAssistant && liveAssistant.num_chunks !== 0 && (
            <div className="pt-4">
              {liveAssistant.document_sets.length > 0 && (
                <div className="mt-2">
                  <p className="mt-4 mb-1 font-bold text-dark-900">
                    Knowledge Sets:{" "}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {liveAssistant.document_sets.map((documentSet) => (
                      <div key={documentSet.id} className="w-fit">
                        <CustomTooltip
                          trigger={
                            <Badge variant="outline">
                              <Bookmark size={16} />
                              {documentSet.name}
                            </Badge>
                          }
                        >
                          <div className="flex items-center gap-1">
                            <Info size={16} />
                            <div className="!text-sm">
                              {" "}
                              {documentSet.description}
                            </div>
                          </div>
                        </CustomTooltip>
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
