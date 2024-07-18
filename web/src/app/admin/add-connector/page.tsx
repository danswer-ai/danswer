"use client";
import { SourceIcon } from "@/components/SourceIcon";
import { AdminPageTitle } from "@/components/admin/Title";
import { ConnectorIcon } from "@/components/icons/icons";
import { SourceCategory, SourceMetadata } from "@/lib/search/interfaces";
import { listSourceMetadata } from "@/lib/sources";
import { GroupedConnectorSummaries } from "@/lib/types";
import { Title, Text } from "@tremor/react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
  const sources = useMemo(() => listSourceMetadata(), []);
  const [searchTerm, setSearchTerm] = useState("");

  const filterSources = (sources: SourceMetadata[]) => {
    return sources.filter((source) =>
      source.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const categorizedSources = useMemo(() => {
    const filtered = filterSources(sources);
    return Object.values(SourceCategory).reduce(
      (acc, category) => {
        acc[category] = filtered.filter(
          (source) => source.category === category
        );
        return acc;
      },
      {} as Record<SourceCategory, SourceMetadata[]>
    );
  }, [sources, searchTerm]);

  return (
    <div className="mx-auto container">
      <AdminPageTitle
        icon={<ConnectorIcon size={32} />}
        title="Add Connector"
      />

      <input
        type="text"
        placeholder="Search connectors..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex mt-2 max-w-sm h-9 w-full rounded-md border-2 border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      {Object.entries(categorizedSources).map(
        ([category, sources]) =>
          sources.length > 0 && (
            <div key={category} className="mb-8">
              <div className="flex mt-8">
                <Title>{category}</Title>
              </div>
              <Text>{getCategoryDescription(category as SourceCategory)}</Text>
              <div className="flex flex-wrap gap-4 p-4">
                {sources.map((source) => (
                  <SourceTile
                    key={source.internalName}
                    sourceMetadata={source}
                  />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}

function getCategoryDescription(category: SourceCategory): string {
  switch (category) {
    case SourceCategory.Messaging:
      return "Integrate with messaging and communication platforms.";
    case SourceCategory.ProjectManagement:
      return "Link to project management and task tracking tools.";
    case SourceCategory.CustomerSupport:
      return "Connect to customer support and helpdesk systems.";
    case SourceCategory.CodeRepository:
      return "Integrate with code repositories and version control systems.";
    case SourceCategory.Storage:
      return "Connect to cloud storage and file hosting services.";
    case SourceCategory.Wiki:
      return "Link to wiki and knowledge base platforms.";
    case SourceCategory.Other:
      return "Connect to other miscellaneous knowledge sources.";
    default:
      return "Connect to various knowledge sources.";
  }
}
