import { getSourceMetadataForSources } from "@/lib/sources";
import { User, ValidSources } from "@/lib/types";
import { Assistant } from "../admin/assistants/interfaces";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Info } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";
import Logo from "../../../public/logo.png";
import Image from "next/image";

export function ChatIntro({
  availableSources,
  liveAssistant,
  children,
  user,
}: {
  availableSources: ValidSources[];
  liveAssistant: Assistant;
  children?: React.ReactNode;
  user?: User | null;
}) {
  const availableSourceMetadata = getSourceMetadataForSources(availableSources);

  return (
    <>
      <div className="flex 2xl:justify-center w-full my-auto">
        <div className="max-w-full 2xl:w-searchbar px-5 2xl:px-0 mt-10 md:mt-16 lg:mt-0 2xl:mt-14">
          <div className="flex flex-col items-center gap-4 pb-6">
            <Image src={Logo} alt="logo" />
            <h1 className="text-[1.5rem] md:text-[2.5rem] font-semibold leading-[1.2] tracking-tighter text-dark-900 text-center">
              Fitness, Workout & Diet - PhD Coach
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-subtle">By |</span>
              <p className="text-dark-900">{user?.full_name}</p>
            </div>
            <p className="text-center text-dark-900 w-3/4 line-clamp">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Minima,
              voluptatum odio? Aspernatur ducimus porro voluptas veniam maiores
              possimus consequuntur debitis dolore dolorum minima saepe, aliquid
              culpa facilis eaque doloremque quisquam.
            </p>
          </div>

          {liveAssistant && liveAssistant.num_chunks !== 0 && (
            <div className="pt-4">
              {liveAssistant.document_sets.length > 0 && (
                <div className="mt-2">
                  <p className="mt-4 mb-1 font-bold text-dark-900">
                    Document Sets:{" "}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {liveAssistant.document_sets.map((documentSet) => (
                      <div key={documentSet.id} className="w-fit">
                        <CustomTooltip
                          trigger={
                            <Badge variant="secondary">
                              <Bookmark size={16} />
                              {documentSet.name}
                            </Badge>
                          }
                        >
                          <div className="flex items-center gap-1">
                            <Info size={16} />
                            <div className="!text-sm">
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

          {children}
        </div>
      </div>
    </>
  );
}
