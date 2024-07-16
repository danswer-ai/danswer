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
        p-4 
        rounded-lg 
        w-40
        ${
          sourceMetadata.category == "Coming Soon" ?
          `bg-gray-200
          cursor-not-allowed
          grayscale
          border-1
          border-gray-400
          `
          :
          `
          shadow-md 
          cursor-pointer 
         bg-hover-light
         hover:bg-hover`
        }
      `}
      href={sourceMetadata.adminUrl}
    >
      <SourceIcon sourceType={sourceMetadata.internalName} iconSize={24} />
      <Text className="mt-2 text-sm font-medium">
        {sourceMetadata.displayName}
      </Text>
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
        <Title>Import Knowledge</Title>
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
        <Title>Setup Auto-Syncing from Apps</Title>
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
        <Title>Coming soon...</Title>
      </div>
      <Text>
        These are the connectors that we are currently working on. Stay tuned!
      </Text>
      <div className="flex flex-wrap gap-4 py-4 md:p-4">
        {comingSoonSources.map((source) => {
          return (
            <SourceTile key={source.internalName} sourceMetadata={source} />
          );
        })}
      </div>
    </div>
  );
}
