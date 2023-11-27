import { ErrorCallout } from "@/components/ErrorCallout";
import { fetchSS } from "@/lib/utilsSS";
import { FaRobot } from "react-icons/fa";
import { Persona } from "../interfaces";
import { PersonaEditor } from "../PersonaEditor";
import { DocumentSet } from "@/lib/types";
import { RobotIcon } from "@/components/icons/icons";
import { BackButton } from "@/components/BackButton";
import { Card, Title, Text, Divider, Button } from "@tremor/react";
import { FiTrash } from "react-icons/fi";
import { DeletePersonaButton } from "./DeletePersonaButton";

export default async function Page({
  params,
}: {
  params: { personaId: string };
}) {
  const personaResponse = await fetchSS(`/persona/${params.personaId}`);

  if (!personaResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch Persona - ${await personaResponse.text()}`}
      />
    );
  }

  const documentSetsResponse = await fetchSS("/manage/document-set");

  if (!documentSetsResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch document sets - ${await documentSetsResponse.text()}`}
      />
    );
  }

  const documentSets = (await documentSetsResponse.json()) as DocumentSet[];
  const persona = (await personaResponse.json()) as Persona;

  return (
    <div className="dark">
      <BackButton />
      <div className="pb-2 mb-4 flex">
        <h1 className="text-3xl font-bold pl-2">Edit Persona</h1>
      </div>

      <Card>
        <PersonaEditor existingPersona={persona} documentSets={documentSets} />
      </Card>

      <div className="mt-12">
        <Title>Delete Persona</Title>
        <div className="flex mt-6">
          <DeletePersonaButton personaId={persona.id} />
        </div>
      </div>
    </div>
  );
}
