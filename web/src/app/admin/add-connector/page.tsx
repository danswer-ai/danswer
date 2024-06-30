
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import SourceTile from "@/components/adminPageComponents/connectors/AdminAddConnectorSourceTitle";
import { ConnectorIcon } from "@/components/icons/icons";
import { SourceCategory } from "@/lib/search/interfaces";
import { listSourceMetadata } from "@/lib/sources";
import { Title, Text } from "@tremor/react";

export default function Page() {
  const sources = listSourceMetadata();

  const importedKnowledgeSources = sources.filter(
    (source) => source.category === SourceCategory.ImportedKnowledge
  );
  const appConnectionSources = sources.filter(
    (source) => source.category === SourceCategory.AppConnection
  );

  return (
    <div className="mx-auto container">
      <AdminPageTitle
        icon={<ConnectorIcon size={32} />}
        title="Add Connector"
      />

      <Text>
        Connect Danswer to your organization&apos;s knowledge sources.
        We&apos;ll automatically sync your data into Danswer, so you can find
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
      <div className="flex flex-wrap gap-4 p-4">
        {importedKnowledgeSources.map((source) => (
            <SourceTile key={source.internalName} sourceMetadata={source} />))}
      </div>

      <div className="flex mt-8">
        <Title>Setup Auto-Syncing from Apps</Title>
      </div>
      <Text>
        Setup auto-syncing from your organization&apos;s most used apps and
        services. Unless otherwise specified during the connector setup, we will
        pull in the latest updates from the source every 10 minutes.
      </Text>
      <div className="flex flex-wrap gap-4 p-4">
        {appConnectionSources.map((source) => (
            <SourceTile key={source.internalName} sourceMetadata={source} />
          ))}
      </div>
    </div>
  );
}
