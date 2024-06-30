"use client";
import { InfoIcon } from "@/components/icons/icons";
import { DocumentSet } from "@/lib/types";
import { useState } from "react";
import {
  FiEdit,
} from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function EditRow ({ documentSet }: { documentSet: DocumentSet }){
    const router = useRouter();
  
    const [isSyncingTooltipOpen, setIsSyncingTooltipOpen] = useState(false);
    return (
      <div className="relative flex">
        {isSyncingTooltipOpen && (
          <div className="flex flex-nowrap absolute w-64 top-0 left-0 mt-8 border border-border bg-background px-3 py-2 rounded shadow-lg break-words z-40">
            <InfoIcon className="mt-1 flex flex-shrink-0 mr-2" /> Cannot update
            while syncing! Wait for the sync to finish, then try again.
          </div>
        )}
        <div
          className={
            "text-emphasis font-medium my-auto p-1 hover:bg-hover-light flex cursor-pointer select-none" +
            (documentSet.is_up_to_date ? " cursor-pointer" : " cursor-default")
          }
          onClick={() => {
            if (documentSet.is_up_to_date) {
              router.push(`/admin/documents/sets/${documentSet.id}`);
            }
          }}
          onMouseEnter={() => {
            if (!documentSet.is_up_to_date) {
              setIsSyncingTooltipOpen(true);
            }
          }}
          onMouseLeave={() => {
            if (!documentSet.is_up_to_date) {
              setIsSyncingTooltipOpen(false);
            }
          }}
        >
          <FiEdit className="text-emphasis mr-1 my-auto" />
          {documentSet.name}
        </div>
      </div>
    );
  };