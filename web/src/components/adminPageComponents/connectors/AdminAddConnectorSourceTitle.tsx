import Link from "next/link";
import { SourceIcon } from "@/components/SourceIcon";
import { SourceMetadata } from "@/lib/search/interfaces";
import { Text } from "@tremor/react";

export default function SourceTile({ sourceMetadata }: { sourceMetadata: SourceMetadata }) {
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