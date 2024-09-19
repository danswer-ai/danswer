import { User } from "@/lib/types";
import { FullEmbeddingModelResponse } from "../admin/models/embedding/embeddingModels";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { fetchSS } from "@/lib/utilsSS";
import Profile from "./profile";
import { BarLayout } from "@/components/BarLayout";
import { getCombinedSettings } from "@/components/settings/lib";
import { CombinedSettings } from "../admin/settings/interfaces";

export default async function ProfilePage() {
  const tasks = [
    getAuthTypeMetadataSS(),
    getCombinedSettings({ forceRetrieval: true }),
    getCurrentUserSS(),
    fetchSS("/manage/indexing-status"),
    fetchSS("/manage/document-set"),
    fetchSS("/assistant"),
    fetchSS("/query/valid-tags"),
    fetchSS("/secondary-index/get-embedding-models"),
  ];

  let results: (
    | User
    | CombinedSettings
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

  const authTypeMetadata = results[0] as AuthTypeMetadata | null;
  const combinedSettings = results[1] as CombinedSettings | null;
  const user = results[2] as User | null;

  const authDisabled = authTypeMetadata?.authType === "disabled";

  if (!authDisabled && !user) {
    return redirect("/auth/login");
  }

  if (user && !user.is_verified && authTypeMetadata?.requiresVerification) {
    return redirect("/auth/waiting-on-verification");
  }

  return (
    <div className="h-full flex relative flex-row">
      <div className="hidden md:flex">
        <BarLayout user={user} />
      </div>
      <div className="h-full container overflow-y-auto">
        <Profile user={user} combinedSettings={combinedSettings} />
      </div>
    </div>
  );
}
