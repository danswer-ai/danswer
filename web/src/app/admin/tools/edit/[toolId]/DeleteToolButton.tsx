"use client";

import { deleteCustomTool } from "@/lib/tools/edit";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

export function DeleteToolButton({ toolId }: { toolId: number }) {
  const router = useRouter();

  return (
    <Button
      onClick={async () => {
        const response = await deleteCustomTool(toolId);
        if (response.data) {
          router.push(`/admin/tools?u=${Date.now()}`);
        } else {
          alert(`Failed to delete tool - ${response.error}`);
        }
      }}
      variant="destructive"
    >
      <Trash size={16} /> Delete
    </Button>
  );
}
