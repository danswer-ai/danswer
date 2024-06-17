"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { UsageReport } from "./interfaces";

import { FiActivity, FiDownloadCloud } from "react-icons/fi";
import {
  Callout,
  DateRangePicker,
  DateRangePickerItem,
  DateRangePickerValue,
  Divider,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";
import { Button } from "@tremor/react";
import { useTimeRange } from "@/lib/hooks";
import { useSWR } from "swr";
import { useEffect } from "react";

function GenerateReportInput({ props }) {
  const [dateRange, setDateRange] = useTimeRange();

  // const onSubmit = useEffect(
  //   const {
  //   data: usageReportData,
  //   isLoading: usageReportLoading,
  //   error: usageReportError,
  // } = useSWR<UsageReport>(
  //   '/admin/generate-usage-report'
  // )
  // )

  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const lastYear = new Date();
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  return (
    <div className="mb-8">
      <Title className="mb-6">Generate Usage Reports</Title>
      <DateRangePicker
        maxDate={new Date()}
        defaultValue={{ selectValue: "allTime" }}
        className="mb-3"
        enableClear={false}
        onValueChange={setDateRange}
      >
        <DateRangePickerItem
          key="lastMonth"
          value="lastMonth"
          from={lastMonth}
          to={new Date()}
        >
          Last Month
        </DateRangePickerItem>
        <DateRangePickerItem
          key="lastYear"
          value="lastYear"
          from={lastYear}
          to={new Date()}
        >
          Last Year
        </DateRangePickerItem>
        <DateRangePickerItem
          key="allTime"
          value="allTime"
          from={new Date(1970, 0, 1)}
          to={new Date()}
        >
          All time
        </DateRangePickerItem>
      </DateRangePicker>
      <Button
        color={"blue"}
        icon={FiDownloadCloud}
        size="xs"
        onSubmit={() => {}}
      >
        Generate Report
      </Button>
      <p className="mt-1 text-xs">This can take a few minutes.</p>
    </div>
  );
}

function DataDisclaimer({ props }) {
  return (
    <div className="mb-10">
      <div className="mx-auto mt-2 mb-6">
        <Callout title="We only see metadata" color="teal">
          <Text>
            <p>We don&apos;t collect ... DISCLAIMER DISCLAIMER DISCLAIMER</p>
            <br />
            <p>We collect ...</p>
            <ul>
              <li> Usage Volume </li>
              <li> Number of Active Seats </li>
              <li> Query Volume (No identifying data) </li>
            </ul>
            <br />
            <p>We use this to ... INFO INFO INFO</p>
          </Text>
        </Callout>
      </div>
    </div>
  );
}

function UsageReportsTable() {
  return (
    <div>
      <Title className="mb-2 mt-6 mx-auto"> Previous Reports </Title>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Report</TableHeaderCell>
            <TableHeaderCell>Period</TableHeaderCell>
            <TableHeaderCell>Time Generated</TableHeaderCell>
            <TableHeaderCell>Download</TableHeaderCell>
          </TableRow>
        </TableHead>
      </Table>
    </div>
  );
}

export default function Page() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Usage Reports"
        icon={<FiActivity size={32} className="my-auto" />}
      />

      <Text className="mb-8">
        Generate usage statistics for all users in the workspace.
      </Text>
      <DataDisclaimer />
      <GenerateReportInput className="mb-10" />
      <Divider />
      <UsageReportsTable />
    </div>
  );
}
