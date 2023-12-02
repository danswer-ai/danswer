import { SourceIcon } from "@/components/SourceIcon";
import { AdminPageTitle } from "@/components/admin/Title";
import { ConnectorIcon } from "@/components/icons/icons";
import { SourceCategory, SourceMetadata } from "@/lib/search/interfaces";
import { listSourceMetadata } from "@/lib/sources";
import { Title, Text } from "@tremor/react";
import Link from "next/link";

function SourceTile({ sourceMetadata }: { sourceMetadata: SourceMetadata }) {
  return (
    <Link
      className={`flex 
        flex-col 
        items-center 
        justify-center 
        bg-dark-tremor-background-muted
        p-4 
        rounded-lg 
        w-40 
        cursor-pointer
        shadow-md
        hover:bg-gray-800
      `}
      href={sourceMetadata.adminUrl}
    >
      <SourceIcon sourceType={sourceMetadata.internalName} iconSize={24} />
      <span className="font-medium text-sm text-gray-300 mt-2">
        {sourceMetadata.displayName}
      </span>
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

  return (
    <div className="mx-auto container dark">
      <AdminPageTitle
        icon={<ConnectorIcon size={32} />}
        title="Add Connector"
      />

      <div className="text-gray-300 text-sm">
        Connect Danswer to your organization&apos;s knowledge sources.
        We&apos;ll automatically sync your data into Danswer, so you can find
        exactly what you&apos;re looking for in one place.
      </div>

      <div className="flex mt-8">
        <Title>Import Knowledge</Title>
      </div>
      <div className="text-gray-300 text-sm">
        Connect to pieces of knowledge that live outside your apps. Upload
        files, scrape websites, or connect to your organization&apos;s Google
        Site.
      </div>
      <div className="flex flex-wrap gap-4 p-4">
        {importedKnowledgeSources.map((source) => {
          return (
            <SourceTile key={source.internalName} sourceMetadata={source} />
          );
        })}
      </div>

      <div className="flex mt-8">
        <Title>Setup Auto-Syncing from Apps</Title>
      </div>
      <div className="text-gray-300 text-sm">
        Setup auto-syncing from your organization&apos;s most used apps and
        services. Unless otherwise specified during the connector setup, we will
        pull in the latest updates from the source every 10 minutes.
      </div>
      <div className="flex flex-wrap gap-4 p-4">
        {appConnectionSources.map((source) => {
          return (
            <SourceTile key={source.internalName} sourceMetadata={source} />
          );
        })}
      </div>
    </div>
  );
}
