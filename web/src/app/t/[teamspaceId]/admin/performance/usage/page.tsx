"use client";

import { DateRangeSelector } from "../DateRangeSelector";
import { FeedbackChart } from "./FeedbackChart";
import { QueryPerformanceChart } from "./QueryPerformanceChart";
import { useTimeRange } from "../lib";
import { AdminPageTitle } from "@/components/admin/Title";
import UsageReports from "./UsageReports";
import { Activity } from "lucide-react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useTimeRange();

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        {/* TODO: remove this `dark` once we have a mode selector */}
        <AdminPageTitle
          title="Usage Statistics"
          icon={<Activity size={32} />}
        />

        <div className="mb-24 space-y-8">
          <div>
            <DateRangeSelector value={timeRange} onValueChange={setTimeRange} />
          </div>
          <QueryPerformanceChart timeRange={timeRange} />
          <FeedbackChart timeRange={timeRange} />
        </div>
        <UsageReports />
      </div>
    </div>
  );
}
