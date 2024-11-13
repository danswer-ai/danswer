"use client";

import { DateRangeSelector } from "@/app/ee/admin/performance/DateRangeSelector";
import { useTimeRange } from "@/app/ee/admin/performance/lib";
import { FeedbackChart } from "@/app/ee/admin/performance/usage/FeedbackChart";
import { QueryPerformanceChart } from "@/app/ee/admin/performance/usage/QueryPerformanceChart";
import UsageReports from "@/app/ee/admin/performance/usage/UsageReports";
import { AdminPageTitle } from "@/components/admin/Title";
import { Activity } from "lucide-react";
import { useParams } from "next/navigation";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useTimeRange();
  const { teamspaceId } = useParams();

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
          <QueryPerformanceChart
            timeRange={timeRange}
            teamspaceId={teamspaceId}
          />
          <FeedbackChart timeRange={timeRange} teamspaceId={teamspaceId} />
        </div>
        <UsageReports teamspaceId={teamspaceId} />
      </div>
    </div>
  );
}
