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
import { WorkSpaceSidebar } from "../chat/sessionSidebar/WorkSpaceSidebar";
import { AssistantsBars } from "../assistants/mine/AssistantsBars";
import TopBar from "@/components/TopBar";
import { DynamicSidebar } from "@/components/DynamicSidebar";
import { ProfileBars } from "./ProfileBars";

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
    <div className="h-full flex relative flex-row">
      <div className="hidden md:flex">
        <ProfileBars user={user} />
      </div>
      <div className="h-full px-6 lg:pl-24 lg:pr-14 xl:px-10 2xl:px-24 container overflow-y-auto">
        <Profile user={user} />
      </div>
    </div>
  );
}
