import { PersonasTable } from "./PersonaTable";
import { FiPlusSquare } from "react-icons/fi";
import Link from "next/link";
import { Divider, Text, Title } from "@tremor/react";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Persona } from "./interfaces";
import { RobotIcon } from "@/components/icons/icons";

export default async function Page() {
  const personaResponse = await fetchSS("/persona");

  if (!personaResponse.ok) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={`Failed to fetch personas - ${await personaResponse.text()}`}
      />
    );
  }

  const personas = (await personaResponse.json()) as Persona[];

  return (
    <div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <RobotIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Personas</h1>
      </div>

      <div className="text-gray-300 text-sm mb-2">
        Personas are a way to build custom search/question-answering experiences
        for different use cases.
        <p className="mt-2">They allow you to customize:</p>
        <ul className="list-disc mt-2 ml-4">
          <li>
            The prompt used by your LLM of choice to respond to the user query
          </li>
          <li>The documents that are used as context</li>
        </ul>
      </div>

      <div className="dark">
        <Divider />

        <Title>Create a Persona</Title>
        <Link
          href="/admin/personas/new"
          className="text-gray-100 flex py-2 px-4 mt-2 border border-gray-800 h-fit cursor-pointer hover:bg-gray-800 text-sm w-36"
        >
          <div className="mx-auto flex">
            <FiPlusSquare className="my-auto mr-2" />
            New Persona
          </div>
        </Link>

        <Divider />

        <Title>Existing Personas</Title>
        <PersonasTable personas={personas} />
      </div>
    </div>
  );
}
