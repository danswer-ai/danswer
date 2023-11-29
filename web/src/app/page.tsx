import { SearchSection } from "@/components/search/SearchSection";
import { Header } from "@/components/Header";
import { getAuthDisabledSS, getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ApiKeyModal } from "@/components/openai/ApiKeyModal";
import { fetchSS } from "@/lib/utilsSS";
import { Connector, DocumentSet, User } from "@/lib/types";
import { cookies } from "next/headers";
import { SearchType } from "@/lib/search/interfaces";
import { Persona } from "./admin/personas/interfaces";

export default async function Home() {
  const tasks = [
    getAuthDisabledSS(),
    getCurrentUserSS(),
    fetchSS("/manage/connector"),
    fetchSS("/manage/document-set"),
    fetchSS("/persona"),
  ];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (User | Response | boolean | null)[] = [null, null, null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }
  const authDisabled = results[0] as boolean;
  const user = results[1] as User | null;
  const connectorsResponse = results[2] as Response | null;
  const documentSetsResponse = results[3] as Response | null;
  const personaResponse = results[4] as Response | null;

  if (!authDisabled && !user) {
    return redirect("/auth/login");
  }

  let connectors: Connector<any>[] = [];
  if (connectorsResponse?.ok) {
    connectors = await connectorsResponse.json();
  } else {
    console.log(`Failed to fetch connectors - ${connectorsResponse?.status}`);
  }

  let documentSets: DocumentSet[] = [];
  if (documentSetsResponse?.ok) {
    documentSets = await documentSetsResponse.json();
  } else {
    console.log(
      `Failed to fetch document sets - ${documentSetsResponse?.status}`
    );
  }

  let personas: Persona[] = [];
  if (personaResponse?.ok) {
    personas = await personaResponse.json();
  } else {
    console.log(`Failed to fetch personas - ${personaResponse?.status}`);
  }

  // needs to be done in a non-client side component due to nextjs
  const storedSearchType = cookies().get("searchType")?.value as
    | string
    | undefined;
  let searchTypeDefault: SearchType =
    storedSearchType !== undefined &&
    SearchType.hasOwnProperty(storedSearchType)
      ? (storedSearchType as SearchType)
      : SearchType.SEMANTIC; // default to semantic

  return (
    <>
      <Header user={user} />
      <div className="m-3">
        <HealthCheckBanner />
      </div>
      <ApiKeyModal />
      <div className="px-24 pt-10 flex flex-col items-center min-h-screen bg-gray-900 text-gray-100">
        <div className="w-full">
          <SearchSection
            connectors={connectors}
            documentSets={documentSets}
            personas={personas}
            defaultSearchType={searchTypeDefault}
          />
        </div>
      </div>
    </>
  );
}
