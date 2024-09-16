import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { PolarChartDataPoint, PolarPlotData } from "./types";

export function PolarChartDisplay({ fileId }: { fileId: string }) {
  const [chartData, setChartData] = useState<PolarChartDataPoint[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({});
  const [plotDataJson, setPlotDataJson] = useState<PolarPlotData | null>(null);

  useEffect(() => {
    fetchPlotData(fileId);
  }, [fileId]);

  const fetchPlotData = async (id: string) => {
    try {
      const response = await fetch(`api/chat/file/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plot data");
      }
      const data: PolarPlotData = await response.json();
      setPlotDataJson(data);

      // Transform the JSON data to the format expected by the chart
      const transformedData: PolarChartDataPoint[] = data.data[0].theta.map(
        (angle, index) => ({
          angle: (angle * 180) / Math.PI, // Convert radians to degrees
          radius: data.data[0].r[index],
        })
      );

      setChartData(transformedData);

      // Create the chart config from the JSON data
      const config: ChartConfig = {
        y: {
          label: data.data[0].label,
          color: data.data[0].color,
        },
      };

      setChartConfig(config);
    } catch (error) {
      console.error("Error fetching plot data:", error);
    }
  };

  if (!plotDataJson) {
    return <div>Loading...</div>;
  }

  return (
    <CardContent>
      <ChartContainer config={chartConfig}>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="angle" type="number" domain={[0, 360]} />
            <PolarRadiusAxis angle={30} domain={[0, plotDataJson.rmax]} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Radar
              name="Polar Plot"
              dataKey="radius"
              stroke={chartConfig.y?.color || "var(--chart-1)"}
              fill={chartConfig.y?.color || "var(--chart-1)"}
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </CardContent>
  );
}

export default PolarChartDisplay;
