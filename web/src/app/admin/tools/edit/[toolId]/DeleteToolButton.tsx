"use client";

import { deleteCustomTool } from "@/lib/tools/edit";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DeleteToolButton({ toolId }: { toolId: number }) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <Button
      onClick={async () => {
        const response = await deleteCustomTool(toolId);
        if (response.data) {
          router.push(`/admin/tools?u=${Date.now()}`);
          toast({
            title: "Tool deleted",
            description: "The tool has been successfully deleted.",
            variant: "success",
          });
        } else {
          toast({
            title: "Failed to delete tool",
            description: `Error details: ${response.error}`,
            variant: "destructive",
          });
        }
      }}
      variant="destructive"
    >
      <Trash size={16} /> Delete
    </Button>
  );
}
