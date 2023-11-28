import { FaRobot } from "react-icons/fa";
import { PersonaEditor } from "../PersonaEditor";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { DocumentSet } from "@/lib/types";
import { RobotIcon } from "@/components/icons/icons";
import { BackButton } from "@/components/BackButton";
import { Card } from "@tremor/react";

export default async function Page() {
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

  return (
    <div className="dark">
      <BackButton />
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <RobotIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Create a New Persona</h1>
      </div>

      <Card>
        <PersonaEditor documentSets={documentSets} />
      </Card>
    </div>
  );
}
