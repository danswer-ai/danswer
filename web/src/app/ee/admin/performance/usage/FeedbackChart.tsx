"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { getDatesList, useQueryAnalytics } from "../lib";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function FeedbackChart({ timeRange }: { timeRange: DateRange }) {
  const {
    data: queryAnalyticsData,
    isLoading: isQueryAnalyticsLoading,
    error: queryAnalyticsError,
  } = useQueryAnalytics(timeRange);

  let chart;
  if (isQueryAnalyticsLoading) {
    chart = (
      <div className="h-80 flex flex-col">
        <ThreeDotsLoader />
      </div>
    );
  } else if (!queryAnalyticsData || queryAnalyticsError) {
    chart = (
      <div className="h-80 text-red-600 text-bold flex flex-col">
        <p className="m-auto">Failed to fetch feedback data...</p>
      </div>
    );
  } else {
    const initialDate = timeRange.from || new Date(queryAnalyticsData[0].date);
    const dateRange = getDatesList(initialDate);

    const dateToQueryAnalytics = new Map(
      queryAnalyticsData.map((queryAnalyticsEntry) => [
        queryAnalyticsEntry.date,
        queryAnalyticsEntry,
      ])
    );

    const data = dateRange.map((dateStr) => {
      const queryAnalyticsForDate = dateToQueryAnalytics.get(dateStr);
      return {
        Day: dateStr,
        "Positive Feedback": queryAnalyticsForDate?.total_likes || 0,
        "Negative Feedback": queryAnalyticsForDate?.total_dislikes || 0,
      };
    });

    const chartConfig = {
      positiveFeedback: {
        label: "Positive Feedback",
        color: "#4c51bf",
      },
      negativeFeedback: {
        label: "Negative Feedback",
        color: "#f43f5e",
      },
    };

    chart = (
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full"
      >
        <AreaChart data={data}>
          <ChartLegend content={<ChartLegendContent />} />
          <defs>
            <linearGradient
              id="fillPositiveFeedback"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={chartConfig.positiveFeedback.color}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={chartConfig.positiveFeedback.color}
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient
              id="fillNegativeFeedback"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={chartConfig.negativeFeedback.color}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={chartConfig.negativeFeedback.color}
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
                indicator="dot"
              />
            }
          />
          <Area
            dataKey="queries"
            type="natural"
            fill="url(#fillPositiveFeedback)"
            stroke={chartConfig.positiveFeedback.color}
            stackId="a"
          />
          <Area
            dataKey="negativeFeedback"
            type="natural"
            fill="url(#fillNegativeFeedback)"
            stroke={chartConfig.negativeFeedback.color}
            stackId="a"
          />
        </AreaChart>
      </ChartContainer>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader className="border-b">
        <div className="flex flex-col">
          <h3 className="font-semibold">Feedback</h3>
          <span className="text-sm text-subtle">
            Thumbs Up / Thumbs Down over time
          </span>
        </div>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}
