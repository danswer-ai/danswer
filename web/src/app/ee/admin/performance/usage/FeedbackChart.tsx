import { getDatesList, useQueryAnalytics } from "../lib";
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
import { SubLabel } from "@/components/admin/connectors/Field";

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
    const endDate = timeRange.to || new Date();
    const dateRange = getDatesList(initialDate, endDate);

    const data = dateRange.map((dateStr) => {
      const queryAnalyticsForDate = queryAnalyticsData.find(
        (entry) => entry.date === dateStr
      );
      return {
        date: dateStr,
        "Positive Feedback": queryAnalyticsForDate?.total_likes || 0,
        "Negative Feedback": queryAnalyticsForDate?.total_dislikes || 0,
      };
    });

    const chartConfig = {
      "Positive Feedback": {
        label: "Positive Feedback",
        color: "#2039f3",
      },
      "Negative Feedback": {
        label: "Negative Feedback",
        color: "#60a5fa",
      },
    } satisfies ChartConfig;

    chart = (
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-full w-full"
      >
        <AreaChart data={data}>
          <ChartLegend content={<ChartLegendContent />} />
          <defs>
            <linearGradient id="fillPositive" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={chartConfig["Positive Feedback"].color}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={chartConfig["Positive Feedback"].color}
                stopOpacity={0.1}
              />
            </linearGradient>
            <linearGradient id="fillNegative" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={chartConfig["Negative Feedback"].color}
                stopOpacity={0.8}
              />
              <stop
                offset="95%"
                stopColor={chartConfig["Negative Feedback"].color}
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
            dataKey="Positive Feedback"
            type="monotoneX"
            fill="url(#fillPositive)"
            stroke={chartConfig["Positive Feedback"].color}
          />
          <Area
            dataKey="Negative Feedback"
            type="monotoneX"
            fill="url(#fillNegative)"
            stroke={chartConfig["Negative Feedback"].color}
          />
        </AreaChart>
      </ChartContainer>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex flex-col">
          <h3 className="font-semibold">Feedback</h3>
          <SubLabel>Thumbs Up / Thumbs Down over time</SubLabel>
        </div>
      </CardHeader>
      <CardContent className="flex-grow h-[250px]">{chart}</CardContent>
    </Card>
  );
}
