"use client";

import { deleteAssistant } from "../lib";
import { useRouter } from "next/navigation";
import { SuccessfulAssistantUpdateRedirectType } from "../enums";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DeleteAssistantButton({
  assistantId,
  redirectType,
}: {
  assistantId: number;
  redirectType: SuccessfulAssistantUpdateRedirectType;
}) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <Button
      onClick={async () => {
        const response = await deleteAssistant(assistantId);
        if (response.ok) {
          toast({
            title: "Assistant deleted",
            description: "The assistant has been successfully deleted.",
            variant: "success",
          });
          router.push(
            redirectType === SuccessfulAssistantUpdateRedirectType.ADMIN
              ? `/admin/assistants?u=${Date.now()}`
              : `/chat`
          );
        } else {
          toast({
            title: "Failed to delete assistant",
            description: `There was an issue deleting the assistant. Details: ${await response.text()}`,
            variant: "destructive",
          });
        }
      }}
      variant="destructive"
    >
      <Trash size={16} /> Delete Assistant
    </Button>
  );
}
