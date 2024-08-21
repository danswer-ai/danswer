import { SourceIcon } from "@/components/SourceIcon";
import { AdminPageTitle } from "@/components/admin/Title";
import { ConnectorIcon } from "@/components/icons/icons";
import { SourceCategory, SourceMetadata } from "@/lib/search/interfaces";
import { listSourceMetadata } from "@/lib/sources";
import { Title, Text } from "@tremor/react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

function SourceTile({
  sourceMetadata,
  disabled,
}: {
  sourceMetadata: SourceMetadata;
  disabled?: boolean;
}) {
  return (
    <Link
      href={sourceMetadata.adminUrl}
      className={disabled ? "pointer-events-none" : ""}
    >
      <Card
        className={`w-40 hover:bg-hover ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <CardContent className="p-4 flex items-center flex-col justify-center">
          <SourceIcon sourceType={sourceMetadata.internalName} iconSize={24} />
          <Text className="mt-2 text-sm font-medium">
            {sourceMetadata.displayName}
          </Text>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Page() {
  const sources = listSourceMetadata();

  const importedKnowledgeSources = sources.filter(
    (source) => source.category === SourceCategory.ImportedKnowledge
  );
  const appConnectionSources = sources.filter(
    (source) => source.category === SourceCategory.AppConnection
  );
  const comingSoonSources = sources.filter(
    (source) => source.category === SourceCategory.ComingSoon
  );

  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ConnectorIcon size={32} />}
        title="Add Connector"
      />

      <Text>
        Connect enMedD CHP to your organization&apos;s knowledge sources.
        We&apos;ll automatically sync your data into enMedD CHP, so you can find
        exactly what you&apos;re looking for in one place.
      </Text>

      <div className="flex mt-8">
        <span className="font-bold pb-2">Import Knowledge</span>
      </div>
      <Text>
        Connect to pieces of knowledge that live outside your apps. Upload
        files, scrape websites, or connect to your organization&apos;s Google
        Site.
      </Text>
      <div className="flex flex-wrap gap-4 py-4 md:p-4">
        {importedKnowledgeSources.map((source) => {
          return (
            <SourceTile key={source.internalName} sourceMetadata={source} />
          );
        })}
      </div>

      <div className="flex mt-8">
        <span className="font-bold pb-2">Setup Auto-Syncing from Apps</span>
      </div>
      <Text>
        Setup auto-syncing from your organization&apos;s most used apps and
        services. Unless otherwise specified during the connector setup, we will
        pull in the latest updates from the source every 10 minutes.
      </Text>
      <div className="flex flex-wrap gap-4 py-4 md:p-4">
        {appConnectionSources.map((source) => {
          return (
            <SourceTile key={source.internalName} sourceMetadata={source} />
          );
        })}
      </div>

      <div className="flex mt-8">
        <span className="font-bold pb-2">Coming soon...</span>
      </div>
      <Text>
        These are the connectors that we are currently working on. Stay tuned!
      </Text>
      <div className="flex flex-wrap gap-4 py-4 md:p-4">
        {comingSoonSources.map((source) => {
          return (
            <SourceTile
              key={source.internalName}
              sourceMetadata={source}
              disabled
            />
          );
        })}
      </div>
    </div>
  );
}
