import { AdminPageTitle } from "@/components/admin/Title";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { Settings, TelemetryReport } from "./interfaces";
import { fetchSS } from "@/lib/utilsSS";

import { FiSettings } from "react-icons/fi";
import {
  Callout,
  Divider,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from "@tremor/react";
import { Button } from "@tremor/react";

function TelemetryReportsTable() {
  return (
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
  );
}

function DataDisclaimer({ props }) {
  return (
    <div {...props}>
      <div className="mx-auto">
        <Callout title="Data Collection" color="teal">
          <Text>
            We don&apos;t collect ... DISCLAIMER DISCLAIMER DISCLAIMER
            <br />
            We collect ...
            <ul>
              <li> Usage Volume </li>
              <li> Number of Active Seats </li>
              <li> Query Volume (No identifying data) </li>
            </ul>
            <br />
            We use this to ... INFO INFO INFO
          </Text>
        </Callout>
      </div>
    </div>
  );
}

export default async function Page() {
  const response = await fetchSS("/settings");

  if (!response.ok) {
    const errorMsg = await response.text();
    return <Callout title="Failed to fetch settings">{errorMsg}</Callout>;
  }

  const settings = (await response.json()) as Settings;

  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Export Telemetry"
        icon={<FiSettings size={32} className="my-auto" />}
      />

      <Text className="mb-8">
        Export Telemetry about usage statistics for all users in the workspace.
      </Text>
      <DataDisclaimer className="mb-20" />
      <Button color={"blue"} size="md">
        Export
      </Button>

      <Divider />

      <TelemetryReportsTable />
    </div>
  );
}
