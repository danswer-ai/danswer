import { ThreeDotsLoader } from "@/components/Loading";
import { getDatesList, usePersonaList, usePersonaMessages } from "../lib";
import { DateRangePickerValue } from "@/app/ee/admin/performance/DateRangeSelector";
import Text from "@/components/ui/text";
import Title from "@/components/ui/title";
import CardSection from "@/components/admin/CardSection";
import { AreaChartDisplay } from "@/components/ui/areaChart";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export function PersonaMessagesChart({
  timeRange,
}: {
  timeRange: DateRangePickerValue;
}) {
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: personaList,
    isLoading: isPersonaListLoading,
    error: personaListError,
  } = usePersonaList();

  const {
    data: personaMessagesData,
    isLoading: isPersonaMessagesLoading,
    error: personaMessagesError,
  } = usePersonaMessages(selectedPersonaIds, timeRange);

  const isLoading = isPersonaListLoading || isPersonaMessagesLoading;
  const hasError = personaListError || personaMessagesError;

  const colors = useMemo(
    () => [
      "#10B981",
      "#3B82F6",
      "#9333EA",
      "#F59E0B",
      "#F43F5E",
      "#6366F1",
      "#06B6D4",
      "#EC4899",
    ],
    []
  );

  const getPersonaColor = useMemo(
    () => (index: number) => colors[index % colors.length],
    [colors]
  );

  // Define color classes for badges
  const colorClasses = useMemo(
    () => ({
      "#10B981": "bg-emerald-100 hover:bg-emerald-200 text-emerald-700",
      "#3B82F6": "bg-blue-100 hover:bg-blue-200 text-blue-700",
      "#9333EA": "bg-purple-100 hover:bg-purple-200 text-purple-700",
      "#F59E0B": "bg-amber-100 hover:bg-amber-200 text-amber-700",
      "#F43F5E": "bg-rose-100 hover:bg-rose-200 text-rose-700",
      "#6366F1": "bg-indigo-100 hover:bg-indigo-200 text-indigo-700",
      "#06B6D4": "bg-cyan-100 hover:bg-cyan-200 text-cyan-700",
      "#EC4899": "bg-pink-100 hover:bg-pink-200 text-pink-700",
    }),
    []
  );

  const chartData = useMemo(() => {
    if (
      !personaMessagesData?.length ||
      !personaList ||
      selectedPersonaIds.length === 0
    ) {
      return null;
    }

    const initialDate =
      timeRange.from ||
      new Date(
        Math.min(
          ...personaMessagesData.map((entry) => new Date(entry.date).getTime())
        )
      );
    const dateRange = getDatesList(initialDate);

    // Create a map for each persona's data
    const personaDataMaps = selectedPersonaIds.map((personaId) => {
      const personaData = personaMessagesData.filter(
        (d) => d.persona_id === personaId
      );
      return {
        personaId,
        dataMap: new Map(personaData.map((entry) => [entry.date, entry])),
      };
    });

    return dateRange.map((dateStr) => {
      const dataPoint: any = { Day: dateStr };
      personaDataMaps.forEach(({ personaId, dataMap }) => {
        const persona = personaList.find((p) => p.id === personaId);
        const messageData = dataMap.get(dateStr);
        dataPoint[persona?.name || `Persona ${personaId}`] =
          messageData?.total_messages || 0;
      });
      return dataPoint;
    });
  }, [personaMessagesData, timeRange.from]);

  const categories = useMemo(
    () =>
      selectedPersonaIds.map(
        (id) => personaList?.find((p) => p.id === id)?.name || `Persona ${id}`
      ),
    [selectedPersonaIds, personaList]
  );

  let content;
  if (isLoading) {
    content = (
      <div className="h-80 flex flex-col">
        <ThreeDotsLoader />
      </div>
    );
  } else if (!personaList || hasError) {
    content = (
      <div className="h-80 text-red-600 text-bold flex flex-col">
        <p className="m-auto">Failed to fetch data...</p>
      </div>
    );
  } else if (selectedPersonaIds.length === 0) {
    content = (
      <div className="h-80 text-gray-500 flex flex-col">
        <p className="m-auto">Select personas to view message analytics</p>
      </div>
    );
  } else if (!personaMessagesData?.length) {
    content = (
      <div className="h-80 text-gray-500 flex flex-col">
        <p className="m-auto">
          No messages found for selected personas in the selected time range
        </p>
      </div>
    );
  } else if (chartData) {
    content = (
      <AreaChartDisplay
        className="mt-4"
        data={chartData}
        categories={categories}
        index="Day"
        colors={selectedPersonaIds.map((_, i) => getPersonaColor(i))}
        yAxisWidth={60}
      />
    );
  }

  const selectedPersonas =
    personaList?.filter((p) => selectedPersonaIds.includes(p.id)) || [];

  return (
    <CardSection className="mt-8">
      <Title>Persona Messages</Title>
      <div className="flex flex-col gap-4">
        <Text>Messages per day for selected personas</Text>
        <div className="flex items-center gap-4">
          <Select
            value=""
            onValueChange={(value) => {
              const personaId = parseInt(value);
              if (selectedPersonaIds.includes(personaId)) {
                // Remove if already selected
                setSelectedPersonaIds(
                  selectedPersonaIds.filter((id) => id !== personaId)
                );
              } else {
                // Add to the end if not selected
                setSelectedPersonaIds([...selectedPersonaIds, personaId]);
              }
            }}
            open={isOpen}
            onOpenChange={(open) => {
              // Only allow closing the dropdown when clicking outside or on the trigger
              if (!open) {
                const activeElement = document.activeElement;
                const isSelectItem =
                  activeElement?.getAttribute("role") === "option";
                if (!isSelectItem) {
                  setIsOpen(false);
                }
              } else {
                setIsOpen(true);
              }
            }}
          >
            <SelectTrigger className="flex w-full max-w-xs">
              <SelectValue placeholder="Select personas to display" />
            </SelectTrigger>
            <SelectContent>
              <div className="flex items-center px-3 pb-2">
                <Search className="mr-2 h-4 w-4" />
                <input
                  className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search personas..."
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const input = e.target.value.toLowerCase();
                    const items = document.querySelectorAll('[role="option"]');
                    items.forEach((item) => {
                      const text = item.textContent?.toLowerCase() || "";
                      (item as HTMLElement).style.display = text.includes(input)
                        ? ""
                        : "none";
                    });
                  }}
                />
              </div>
              {personaList?.map((persona) => (
                <SelectItem
                  key={persona.id}
                  value={persona.id.toString()}
                  className={cn(
                    "cursor-pointer hover:bg-gray-100",
                    selectedPersonaIds.includes(persona.id) &&
                      "!bg-blue-50 hover:!bg-blue-50"
                  )}
                >
                  {persona.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPersonas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedPersonas.map((persona) => {
              const index = selectedPersonaIds.indexOf(persona.id);
              return (
                <Badge
                  key={persona.id}
                  variant="secondary"
                  className={cn(
                    "flex items-center gap-1",
                    colorClasses[
                      colors[index % colors.length] as keyof typeof colorClasses
                    ]
                  )}
                >
                  {persona.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setSelectedPersonaIds(
                        selectedPersonaIds.filter((id) => id !== persona.id)
                      )
                    }
                  />
                </Badge>
              );
            })}
          </div>
        )}
      </div>
      {content}
    </CardSection>
  );
}
