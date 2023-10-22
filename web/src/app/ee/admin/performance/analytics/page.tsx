"use client";

import { DateRangeSelector } from "../DateRangeSelector";
import { FeedbackChart } from "./FeedbackChart";
import { QueryPerformanceChart } from "./QueryPerformanceChart";
import { BarChartIcon } from "@/components/icons/icons";
import { useTimeRange } from "../lib";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useTimeRange();

  return (
    <main className="pt-4 mx-auto container dark">
      {/* TODO: remove this `dark` once we have a mode selector */}
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <BarChartIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Analytics</h1>
      </div>

      <DateRangeSelector value={timeRange} onValueChange={setTimeRange} />

      <QueryPerformanceChart timeRange={timeRange} />
      <FeedbackChart timeRange={timeRange} />
    </main>
  );
}
