import { useChatContext } from "@/context/ChatContext";
import { FilterManager } from "@/lib/hooks";
import { listSourceMetadata } from "@/lib/sources";
import { useRef, useState } from "react";
import { Text } from "@tremor/react";
import { DocumentSetSelectable } from "@/components/documentSet/DocumentSetSelectable";
import { Bubble } from "@/components/Bubble";
import { FiX } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FilterDatePicker } from "./FilterDatePicker";

export function FiltersTab({
  filterManager,
}: {
  filterManager: FilterManager;
}): JSX.Element {
  const [filterValue, setFilterValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { availableSources, availableDocumentSets, availableTags } =
    useChatContext();

  const allSources = listSourceMetadata();
  const availableSourceMetadata = allSources.filter((source) =>
    availableSources.includes(source.internalName)
  );

  return (
    <div className="flex flex-col">
      <div>
        <div>
          <div>
            <h3 className="text-dark-900 pb-2 font-semibold">Time Range</h3>
            <Text>
              Choose the time range we should search over. If only one date is
              selected, will only search after the specified date.
            </Text>
            <div className="mt-2">
              <FilterDatePicker filterManager={filterManager} />
            </div>
          </div>

          <Separator className="my-8" />

          <div>
            <h3 className="text-dark-900 pb-2 font-semibold">Knowledge Sets</h3>
            <Text>
              Choose which knowledge sets we should search over. If multiple are
              selected, we will search through all of them.
            </Text>
            <ul className="mt-3 flex gap-2 flex-wrap">
              {availableDocumentSets.length > 0 ? (
                availableDocumentSets.map((set) => {
                  const isSelected =
                    filterManager.selectedDocumentSets.includes(set.name);
                  return (
                    <DocumentSetSelectable
                      key={set.id}
                      documentSet={set}
                      isSelected={isSelected}
                      onSelect={() =>
                        filterManager.setSelectedDocumentSets((prev) =>
                          isSelected
                            ? prev.filter((s) => s !== set.name)
                            : [...prev, set.name]
                        )
                      }
                    />
                  );
                })
              ) : (
                <li>No knowledge sets available</li>
              )}
            </ul>
          </div>

          <Separator className="my-8" />

          <div>
            <h3 className="text-dark-900 pb-2 font-semibold">Sources</h3>
            <Text>
              Choose which sources we should search over. If multiple sources
              are selected, we will search through all of them.
            </Text>
            <ul className="mt-3 flex gap-2">
              {availableSourceMetadata.length > 0 ? (
                availableSourceMetadata.map((sourceMetadata) => {
                  const isSelected = filterManager.selectedSources.some(
                    (selectedSource) =>
                      selectedSource.internalName ===
                      sourceMetadata.internalName
                  );
                  /* return (
                    <Bubble
                      key={sourceMetadata.internalName}
                      isSelected={isSelected}
                      onClick={() =>
                        filterManager.setSelectedSources((prev) =>
                          isSelected
                            ? prev.filter(
                                (s) =>
                                  s.internalName !== sourceMetadata.internalName
                              )
                            : [...prev, sourceMetadata]
                        )
                      }
                      showCheckbox={true}
                    >
                      <div className="flex items-center space-x-2">
                        {sourceMetadata?.icon({ size: 16 })}
                        <span>{sourceMetadata.displayName}</span>
                      </div>
                    </Bubble>
                  ); */
                  return (
                    <Bubble
                      key={sourceMetadata.internalName}
                      isSelected={isSelected}
                      onClick={() =>
                        filterManager.setSelectedSources((prev) =>
                          isSelected
                            ? prev.filter(
                                (s) =>
                                  s.internalName !== sourceMetadata.internalName
                              )
                            : [...prev, sourceMetadata]
                        )
                      }
                      showCheckbox={true}
                    >
                      <div className="flex items-center space-x-2">
                        {sourceMetadata?.icon({ size: 16 })}
                        <span>{sourceMetadata.displayName}</span>
                      </div>
                    </Bubble>
                  );
                })
              ) : (
                <li>No sources available</li>
              )}
            </ul>
          </div>

          <Separator className="my-8" />

          <div>
            <h3 className="text-dark-900 pb-2 font-semibold">Tags</h3>
            <ul className="space-2 gap-2 flex flex-wrap">
              {filterManager.selectedTags.length > 0 ? (
                filterManager.selectedTags.map((tag) => (
                  <Bubble
                    key={tag.tag_key + tag.tag_value}
                    isSelected={true}
                    onClick={() =>
                      filterManager.setSelectedTags((prev) =>
                        prev.filter(
                          (t) =>
                            t.tag_key !== tag.tag_key ||
                            t.tag_value !== tag.tag_value
                        )
                      )
                    }
                  >
                    <div className="flex items-center space-x-2 text-sm">
                      <p>
                        {tag.tag_key}={tag.tag_value}
                      </p>{" "}
                      <FiX />
                    </div>
                  </Bubble>
                ))
              ) : (
                <p className="text-xs italic">No selected tags</p>
              )}
            </ul>

            <div className="xl:w-96 mt-2">
              <div>
                <div className="mb-2 pt-2">
                  <Input
                    ref={inputRef}
                    placeholder="Find a tag"
                    value={filterValue}
                    onChange={(event) => setFilterValue(event.target.value)}
                  />
                </div>

                <div className="max-h-48 flex flex-col gap-y-1 overflow-y-auto">
                  {availableTags.length > 0 ? (
                    availableTags
                      .filter(
                        (tag) =>
                          !filterManager.selectedTags.some(
                            (selectedTag) =>
                              selectedTag.tag_key === tag.tag_key &&
                              selectedTag.tag_value === tag.tag_value
                          ) &&
                          (tag.tag_key.includes(filterValue) ||
                            tag.tag_value.includes(filterValue))
                      )
                      .slice(0, 12)
                      .map((tag) => (
                        <Bubble
                          key={tag.tag_key + tag.tag_value}
                          isSelected={filterManager.selectedTags.includes(tag)}
                          onClick={() =>
                            filterManager.setSelectedTags((prev) =>
                              filterManager.selectedTags.includes(tag)
                                ? prev.filter(
                                    (t) =>
                                      t.tag_key !== tag.tag_key ||
                                      t.tag_value !== tag.tag_value
                                  )
                                : [...prev, tag]
                            )
                          }
                        >
                          <>
                            {tag.tag_key}={tag.tag_value}
                          </>
                        </Bubble>
                      ))
                  ) : (
                    <div className="text-sm px-2 py-2">
                      No matching tags found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
