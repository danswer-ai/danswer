import { User } from "@/lib/types";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { SideBar } from "../SideBar";
import { BarLayout } from "../BarLayout";
import { AdminBar } from "./AdminBar";
import { HealthCheckBanner } from "../health/healthcheck";

export async function Layout({ children }: { children: React.ReactNode }) {
  const tasks = [getAuthTypeMetadataSS(), getCurrentUserSS()];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (User | AuthTypeMetadata | null)[] = [null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }

  const authTypeMetadata = results[0] as AuthTypeMetadata | null;
  const user = results[1] as User | null;

  const authDisabled = authTypeMetadata?.authType === "disabled";
  const requiresVerification = authTypeMetadata?.requiresVerification;
  if (!authDisabled) {
    if (!user) {
      return redirect("/auth/login");
    }
    if (user.role !== "admin") {
      return redirect("/");
    }
    if (!user.is_verified && requiresVerification) {
      return redirect("/auth/waiting-on-verification");
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <HealthCheckBanner />
      <div className="flex h-full">
        <AdminBar user={user}>
          <SideBar />
        </AdminBar>
        <div className="h-full overflow-y-auto w-full">
          <div className="h-full px-6 lg:pl-24 lg:pr-14 xl:px-10 2xl:px-24 container">
            <div className="h-full container mx-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
