import React, { useEffect, useState } from "react";
import { PickaxeIcon, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CardFooter } from "@/components/ui/card";
import {
  DexpandTwoIcon,
  DownloadCSVIcon,
  ExpandTwoIcon,
  OpenIcon,
  PaintingIcon,
  PaintingIconSkeleton,
} from "@/components/icons/icons";
import {
  CustomTooltip,
  TooltipGroup,
} from "@/components/tooltip/CustomTooltip";
import { Modal } from "@/components/Modal";
import { ChartDataPoint, ChartType, Data, PlotData } from "./types";
import { SelectionBackground } from "@phosphor-icons/react";

export function ModalChartWrapper({
  children,
  fileId,
  chartType,
}: {
  children: JSX.Element;
  fileId: string;
  chartType: ChartType;
}) {
  const [expanded, setExpanded] = useState(false);
  const expand = () => {
    setExpanded((expanded) => !expanded);
  };

  return (
    <>
      {expanded ? (
        <Modal
          onOutsideClick={() => setExpanded(false)}
          className="animate-all ease-in !p-0"
        >
          <ChartWrapper
            chartType={chartType}
            expand={expand}
            expanded={expanded}
            fileId={fileId}
          >
            {children}
          </ChartWrapper>
        </Modal>
      ) : (
        <ChartWrapper
          chartType={chartType}
          expand={expand}
          expanded={expanded}
          fileId={fileId}
        >
          {children}
        </ChartWrapper>
      )}
    </>
  );
}

export function ChartWrapper({
  expanded,
  children,
  fileId,
  chartType,
  expand,
}: {
  expanded: boolean;
  children: JSX.Element;
  chartType: ChartType;
  fileId: string;
  expand: () => void;
}) {
  const [plotDataJson, setPlotDataJson] = useState<Data | null>(null);

  useEffect(() => {
    fetchPlotData(fileId);
  }, [fileId]);

  const fetchPlotData = async (id: string) => {
    if (chartType == "other") {
      setPlotDataJson({ title: "Uploaded Chart" });
    } else {
      try {
        const response = await fetch(`api/chat/file/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch plot data");
        }
        const data = await response.json();
        setPlotDataJson(data);
      } catch (error) {
        console.error("Error fetching plot data:", error);
      }
    }
  };

  const downloadFile = () => {
    if (!fileId) return;
    // Implement download functionality here
  };

  if (!plotDataJson) {
    return <div>Loading...</div>;
  }
  return (
    <div className="bg-background-50 group rounded-lg shadow-md relative">
      <div className="relative p-4">
        <div className="relative flex pb-2 items-center justify-between">
          <h2 className="text-xl font-semibold mb-2">{plotDataJson.title}</h2>
          <div className="flex gap-x-2">
            <TooltipGroup>
              {chartType != "other" && (
                <CustomTooltip
                  showTick
                  line
                  position="top"
                  content="View Static file"
                >
                  <button onClick={() => downloadFile()}>
                    <PaintingIconSkeleton className="cursor-pointer transition-colors duration-300 hover:text-neutral-800 h-6 w-6 text-neutral-400" />
                  </button>
                </CustomTooltip>
              )}

              <CustomTooltip
                showTick
                line
                position="top"
                content="Download file"
              >
                <button onClick={() => downloadFile()}>
                  <DownloadCSVIcon className="cursor-pointer ml-4 transition-colors duration-300 hover:text-neutral-800 h-6 w-6 text-neutral-400" />
                </button>
              </CustomTooltip>
              <CustomTooltip
                line
                position="top"
                content={expanded ? "Minimize" : "Full screen"}
              >
                <button onClick={() => expand()}>
                  {!expanded ? (
                    <ExpandTwoIcon className="transition-colors duration-300 ml-4 hover:text-neutral-800 h-6 w-6 cursor-pointer text-neutral-400" />
                  ) : (
                    <DexpandTwoIcon className="transition-colors duration-300 ml-4 hover:text-neutral-800 h-6 w-6 cursor-pointer text-neutral-400" />
                  )}
                </button>
              </CustomTooltip>
            </TooltipGroup>
          </div>
        </div>
        {children}
        {chartType === "other" && (
          <div className="absolute bottom-6 right-6 p-1.5 rounded flex gap-x-2 items-center border border-neutral-200 bg-neutral-50  opacity-0 transition-opacity duration-300 ease-in-out text-sm text-gray-500 group-hover:opacity-100">
            <SelectionBackground />
            Interactive charts of this type are not supported yet
          </div>
        )}
      </div>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Data from Matplotlib plot <TrendingUp className="h-4 w-4" />
        </div>
      </CardFooter>
    </div>
  );
}

export function LineChartDisplay({ fileId }: { fileId: string }) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({});

  useEffect(() => {
    fetchPlotData(fileId);
  }, [fileId]);

  const fetchPlotData = async (id: string) => {
    try {
      const response = await fetch(`api/chat/file/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plot data");
      }
      const plotDataJson: PlotData = await response.json();
      console.log("plot data");
      console.log(plotDataJson);

      const transformedData: ChartDataPoint[] = plotDataJson.data[0].x.map(
        (x, index) => ({
          x: x,
          y: plotDataJson.data[0].y[index],
        })
      );

      setChartData(transformedData);

      const config: ChartConfig = {
        y: {
          label: plotDataJson.data[0].label,
          color: plotDataJson.data[0].color,
        },
      };

      setChartConfig(config);
    } catch (error) {
      console.error("Error fetching plot data:", error);
    }
  };
  console.log("chartData");
  console.log(chartData);

  return (
    <div className="w-full h-full">
      <ChartContainer config={chartConfig}>
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: number) => value.toFixed(2)}
          />
          <YAxis
            dataKey="y"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: number) => value.toFixed(2)}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Line
            dataKey="y"
            type="natural"
            stroke={chartConfig.y?.color || "var(--chart-1)"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
