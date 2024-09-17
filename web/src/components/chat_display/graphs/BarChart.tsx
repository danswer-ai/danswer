import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { CardContent } from "@/components/ui/card";

interface BarDataPoint {
  x: number;
  y: number;
  width: number;
  color: string;
}

interface BarPlotData {
  data: BarDataPoint[];
  title: string;
  xlabel: string;
  ylabel: string;
  xticks: number[];
  xticklabels: string[];
}

export function BarChartDisplay({ fileId }: { fileId: string }) {
  const [barPlotData, setBarPlotData] = useState<BarPlotData | null>(null);

  useEffect(() => {
    fetchPlotData(fileId);
  }, [fileId]);

  const fetchPlotData = async (id: string) => {
    try {
      const response = await fetch(`api/chat/file/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch plot data");
      }
      const data: BarPlotData = await response.json();
      setBarPlotData(data);
    } catch (error) {
      console.error("Error fetching plot data:", error);
    }
  };

  if (!barPlotData) {
    return <div>Loading...</div>;
  }
  console.log("IN THE FUNCTION");

  // Transform data to match Recharts expected format
  const transformedData = barPlotData.data.map((point, index) => ({
    name: barPlotData.xticklabels[index] || point.x.toString(),
    value: point.y,
  }));

  return (
    <>
      <h2>{barPlotData.title}</h2>
      <BarChart
        width={600}
        height={400}
        data={transformedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          label={{
            value: barPlotData.xlabel,
            position: "insideBottom",
            offset: -10,
          }}
        />
        <YAxis
          label={{
            value: barPlotData.ylabel,
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip />
        <Bar dataKey="value" fill={barPlotData.data[0].color} />
      </BarChart>
    </>
  );
}

export default BarChartDisplay;
