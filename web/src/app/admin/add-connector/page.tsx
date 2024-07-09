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
        cursor-pointer
        bg-hover-light
        shadow-md
        hover:bg-hover
      `}
      href={sourceMetadata.adminUrl}
    >
      <SourceIcon sourceType={sourceMetadata.internalName} iconSize={24} />
      <Text className="font-medium text-sm mt-2">
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

  return (
    <div className="mx-auto container">
      <AdminPageTitle
        icon={<ConnectorIcon size={32} />}
        title="Quelle hinzufügen"
      />

      <Text>
        Verknüpfe Blona mit Deinen Datenquellen. Wir synchronisieren die Daten automaisch. 
      </Text>

      <div className="flex mt-8">
        <Title>Wissen importieren</Title>
      </div>
      <Text>
        Weitere Datenquellen hinzufügen
      </Text>
      <div className="flex flex-wrap gap-4 p-4">
        {importedKnowledgeSources.map((source) => {
          return (
            <SourceTile key={source.internalName} sourceMetadata={source} />
          );
        })}
      </div>

      <div className="flex mt-8">
        <Title>Auto-Syncing aufsetzen</Title>
      </div>
      <Text>
        Alle 10 Minuten
      </Text>
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
