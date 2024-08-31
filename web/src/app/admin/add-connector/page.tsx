"use client";

import { BackButton } from "@/components/BackButton";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SourceIcon } from "@/components/SourceIcon";
import { AdminPageTitle } from "@/components/admin/Title";
import { Input } from "@/components/ui/input";
import { SourceCategory, SourceMetadata } from "@/lib/search/interfaces";
import { listSourceMetadata } from "@/lib/sources";
import { CloudUpload, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

function SourceTile({
  sourceMetadata,
  disabled,
  category,
}: {
  sourceMetadata: SourceMetadata;
  disabled?: boolean;
  category?: string;
}) {
  return (
    <Link
      href={sourceMetadata.adminUrl}
      className={
        category?.toLocaleLowerCase() === "coming soon"
          ? "pointer-events-none"
          : ""
      }
    >
      <CustomTooltip
        trigger={
          <div
            className={`hover:border-primary border rounded-lg flex items-center justify-center p-[18px] w-16 h-16 ${
              category?.toLocaleLowerCase() === "coming soon"
                ? "cursor-not-allowed grayscale"
                : ""
            }`}
          >
            <SourceIcon
              sourceType={sourceMetadata.internalName}
              iconSize={24}
            />
          </div>
        }
        delayDuration={0}
        style="bg-primary border-none text-inverted"
      >
        {sourceMetadata.displayName}
      </CustomTooltip>
    </Link>
  );
}

export default function Page() {
  const sources = useMemo(() => listSourceMetadata(), []);
  const [searchTerm, setSearchTerm] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const categorizedSources = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = sources.filter(
      (source) =>
        source.displayName.toLowerCase().includes(lowerSearchTerm) ||
        source.category.toLowerCase().includes(lowerSearchTerm)
    );

    return Object.values(SourceCategory).reduce(
      (acc, category) => {
        if (category === SourceCategory.Disabled) {
          return acc;
        }

        acc[category] = sources.filter(
          (source) =>
            source.category === category &&
            (filtered.includes(source) ||
              category.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        return acc;
      },
      {} as Record<SourceCategory, SourceMetadata[]>
    );
  }, [sources, searchTerm]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const filteredCategories = Object.entries(categorizedSources).filter(
        ([_, sources]) => sources.length > 0
      );
      if (
        filteredCategories.length > 0 &&
        filteredCategories[0][1].length > 0
      ) {
        const firstSource = filteredCategories[0][1][0];
        if (firstSource) {
          window.open(firstSource.adminUrl, "_self");
        }
      }
    }
  };

  return (
    <div className="mx-auto container">
      <AdminPageTitle
        icon={<CloudUpload size={24} />}
        title="Add Data Source"
      />

      <p className="p-2.5 pt-0">
        Connect enMedD AI to your organization&apos;s knowledge sources.
        We&apos;ll automatically sync your data into enMedD AI, so you can find
        exactly what you&apos;re looking for in one place.
      </p>

      <div className="relative md:w-96 mt-6">
        <Input
          className="pl-9"
          ref={searchInputRef}
          placeholder="Search connectors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2"
          size={15}
        />
      </div>

      {Object.entries(categorizedSources)
        .filter(([_, sources]) => sources.length > 0)
        .map(([category, sources], categoryInd) => (
          <div key={category} className="border rounded-lg p-6 mt-6">
            <span className="font-bold pb-2 block text-lg md:text-2xl text-strong">
              {category}
            </span>
            <div className="flex items-center flex-wrap gap-4 pt-6">
              {sources.map((source, sourceInd) => (
                <SourceTile
                  key={source.internalName}
                  sourceMetadata={source}
                  category={category}
                  disabled
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
