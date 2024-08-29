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
    <main className="pt-4 mx-auto container">
      {/* TODO: remove this `dark` once we have a mode selector */}
      <AdminPageTitle
        title="Usage Statistics"
        icon={<FiActivity size={32} />}
      />

      <Card className="mb-12">
        <CardHeader>
          <DateRangeSelector value={timeRange} onValueChange={setTimeRange} />
        </CardHeader>
        <CardContent>
          <QueryPerformanceChart timeRange={timeRange} />
          <FeedbackChart timeRange={timeRange} />
        </CardContent>
      </Card>
      <UsageReports />
    </main>
  );
}
