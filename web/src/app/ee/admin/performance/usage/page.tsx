"use client";

import { DateRangeSelector } from "../DateRangeSelector";
import { FeedbackChart } from "./FeedbackChart";
import { QueryPerformanceChart } from "./QueryPerformanceChart";
import { BarChartIcon } from "@/components/icons/icons";
import { useTimeRange } from "../lib";
import { AdminPageTitle } from "@/components/admin/Title";
import { FiActivity } from "react-icons/fi";
import UsageReports from "./UsageReports";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useTimeRange();

  return (
    <main className="container mx-auto py-24 md:py-32 lg:pt-16">
      {/* TODO: remove this `dark` once we have a mode selector */}
      <AdminPageTitle
        title="Usage Statistics"
        icon={<FiActivity size={32} />}
      />

      <div className="mb-24 space-y-8">
        <div>
          <DateRangeSelector value={timeRange} onValueChange={setTimeRange} />
        </div>
        <QueryPerformanceChart timeRange={timeRange} />
        <FeedbackChart timeRange={timeRange} />
      </div>
      <UsageReports />
    </main>
  );
}
