import { ChatProvider } from "@/context/ChatContext";
import { DynamicSidebar } from "@/components/DynamicSidebar";
import { User } from "@/lib/types";
import { unstable_noStore as noStore } from "next/cache";
import { FullEmbeddingModelResponse } from "../admin/models/embedding/embeddingModels";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { fetchSS } from "@/lib/utilsSS";

export default async function ProfilePage() {
  const tasks = [
    getAuthTypeMetadataSS(),
    getCurrentUserSS(),
    fetchSS("/manage/indexing-status"),
    fetchSS("/manage/document-set"),
    fetchSS("/assistant"),
    fetchSS("/query/valid-tags"),
    fetchSS("/secondary-index/get-embedding-models"),
  ];

  let results: (
    | User
    | Response
    | AuthTypeMetadata
    | FullEmbeddingModelResponse
    | null
  )[] = [null, null, null, null, null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }

  const user = results[1] as User | null;
  const authTypeMetadata = results[0] as AuthTypeMetadata | null;

  const authDisabled = authTypeMetadata?.authType === "disabled";

  if (!authDisabled && !user) {
    return redirect("/auth/login");
  }

  if (user && !user.is_verified && authTypeMetadata?.requiresVerification) {
    return redirect("/auth/waiting-on-verification");
  }

  return (
    <div className="h-full overflow-x-hidden">
      <DynamicSidebar user={user} />
    </div>
  );
}
