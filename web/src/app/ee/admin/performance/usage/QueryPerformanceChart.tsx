"use client";

import { getDatesList, useQueryAnalytics, useUserAnalytics } from "../lib";
import { ThreeDotsLoader } from "@/components/Loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { DateRangeSelector } from "../DateRangeSelector";
import { SubLabel } from "@/components/admin/connectors/Field";

export function QueryPerformanceChart({ timeRange }: { timeRange: DateRange }) {
  const {
    data: queryAnalyticsData,
    isLoading: isQueryAnalyticsLoading,
    error: queryAnalyticsError,
  } = useQueryAnalytics(timeRange);
  const {
    data: userAnalyticsData,
    isLoading: isUserAnalyticsLoading,
    error: userAnalyticsError,
  } = useUserAnalytics(timeRange);

  let chart;
  if (isQueryAnalyticsLoading || isUserAnalyticsLoading) {
    chart = (
      <div className="h-80 flex flex-col">
        <ThreeDotsLoader />
      </div>
    );
  } else if (
    !queryAnalyticsData ||
    !userAnalyticsData ||
    queryAnalyticsError ||
    userAnalyticsError
  ) {
    chart = (
      <div className="h-80 text-red-600 text-bold flex flex-col">
        <p className="m-auto">Failed to fetch query data...</p>
      </div>
    );
  } else {
    const initialDate = timeRange.from || new Date(queryAnalyticsData[0].date);
    const dateRange = getDatesList(initialDate);

    const data = dateRange.map((dateStr) => {
      const queryAnalyticsForDate = queryAnalyticsData.find(
        (entry) => entry.date === dateStr
      );
      const userAnalyticsForDate = userAnalyticsData.find(
        (entry) => entry.date === dateStr
      );
      return {
        date: dateStr,
        queries: queryAnalyticsForDate?.total_queries || 0,
        uniqueUsers: userAnalyticsForDate?.total_active_users || 0,
      };
    });

    const chartConfig = {
      queries: {
        label: "Queries",
        color: "#2039f3",
      },
      uniqueUsers: {
        label: "Unique Users",
        color: "#60a5fa",
      },
    } satisfies ChartConfig;

    chart = (
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full"
      >
        <AreaChart data={data}>
          <ChartLegend content={<ChartLegendContent />} />
          <defs>
            <linearGradient id="fillQueries" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={chartConfig.queries.color}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={chartConfig.queries.color}
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id="fillUniqueUsers" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={chartConfig.uniqueUsers.color}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={chartConfig.uniqueUsers.color}
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
            fill="url(#fillQueries)"
            stroke={chartConfig.queries.color}
            stackId="a"
          />
          <Area
            dataKey="uniqueUsers"
            type="natural"
            fill="url(#fillUniqueUsers)"
            stroke={chartConfig.uniqueUsers.color}
            stackId="a"
          />
        </AreaChart>
      </ChartContainer>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col">
          <h3 className="font-semibold">Usage</h3>
          <SubLabel>Usage over time</SubLabel>
        </div>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}
