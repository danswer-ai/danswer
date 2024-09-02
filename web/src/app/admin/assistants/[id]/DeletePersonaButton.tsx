"use client";

import { deletePersona } from "../lib";
import { useRouter } from "next/navigation";
import { SuccessfulPersonaUpdateRedirectType } from "../enums";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

export function DeletePersonaButton({
  personaId,
  redirectType,
}: {
  personaId: number;
  redirectType: SuccessfulPersonaUpdateRedirectType;
}) {
  const router = useRouter();

  return (
    <Button
      onClick={async () => {
        const response = await deletePersona(personaId);
        if (response.ok) {
          router.push(
            redirectType === SuccessfulPersonaUpdateRedirectType.ADMIN
              ? `/admin/assistants?u=${Date.now()}`
              : `/chat`
          );
        } else {
          alert(`Failed to delete persona - ${await response.text()}`);
        }
      }}
      variant="destructive"
    >
      <Trash size={16} /> Delete
    </Button>
  );
}
