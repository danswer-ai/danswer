import { ThreeDotsLoader } from "@/components/Loading";
import { getDatesList, useonyxBotAnalytics } from "../lib";
import {
  AreaChart,
  Card,
  Title,
  Text,
  DateRangePickerValue,
} from "@tremor/react";

export function onyxBotChart({
  timeRange,
}: {
  timeRange: DateRangePickerValue;
}) {
  const {
    data: onyxBotAnalyticsData,
    isLoading: isonyxBotAnalyticsLoading,
    error: onyxBotAnalyticsError,
  } = useonyxBotAnalytics(timeRange);

  let chart;
  if (isonyxBotAnalyticsLoading) {
    chart = (
      <div className="h-80 flex flex-col">
        <ThreeDotsLoader />
      </div>
    );
  } else if (!onyxBotAnalyticsData || onyxBotAnalyticsError) {
    chart = (
      <div className="h-80 text-red-600 text-bold flex flex-col">
        <p className="m-auto">Failed to fetch feedback data...</p>
      </div>
    );
  } else {
    const initialDate =
      timeRange.from || new Date(onyxBotAnalyticsData[0].date);
    const dateRange = getDatesList(initialDate);

    const dateToonyxBotAnalytics = new Map(
      onyxBotAnalyticsData.map((onyxBotAnalyticsEntry) => [
        onyxBotAnalyticsEntry.date,
        onyxBotAnalyticsEntry,
      ])
    );

    chart = (
      <AreaChart
        className="mt-4 h-80"
        data={dateRange.map((dateStr) => {
          const onyxBotAnalyticsForDate = dateToonyxBotAnalytics.get(dateStr);
          return {
            Day: dateStr,
            "Total Queries": onyxBotAnalyticsForDate?.total_queries || 0,
            "Automatically Resolved":
              onyxBotAnalyticsForDate?.auto_resolved || 0,
          };
        })}
        categories={["Total Queries", "Automatically Resolved"]}
        index="Day"
        colors={["indigo", "fuchsia"]}
        valueFormatter={(number: number) =>
          `${Intl.NumberFormat("us").format(number).toString()}`
        }
        yAxisWidth={60}
      />
    );
  }

  return (
    <Card className="mt-8">
      <Title>Slack Bot</Title>
      <Text>Total Queries vs Auto Resolved</Text>
      {chart}
    </Card>
  );
}
