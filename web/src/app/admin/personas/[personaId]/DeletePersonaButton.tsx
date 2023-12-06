"use client";

import { Button } from "@tremor/react";
import { FiTrash } from "react-icons/fi";
import { deletePersona } from "../lib";
import { useRouter } from "next/navigation";

export function DeletePersonaButton({ personaId }: { personaId: number }) {
  const router = useRouter();

  return (
    <Button
      size="xs"
      color="red"
      onClick={async () => {
        const response = await deletePersona(personaId);
        if (response.ok) {
          router.push(`/admin/personas?u=${Date.now()}`);
        } else {
          alert(`Failed to delete persona - ${await response.text()}`);
        }
      }}
      icon={FiTrash}
    >
      Delete
    </Button>
  );
}
