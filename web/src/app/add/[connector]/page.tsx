import Cookies from "js-cookie";
import WrappedSlackPage from "./Wrapper";
import { SIDEBAR_TOGGLED_COOKIE_NAME } from "@/components/resizable/contants";
import { cookies } from "next/headers";
import { getCurrentUserSS } from "@/lib/userSS";
import { User } from "@/lib/types";

export default async function Page({
  params,
}: {
  params: { connector: string };
}) {
  const sidebarToggled = cookies().get(SIDEBAR_TOGGLED_COOKIE_NAME);

  const tasks = [getCurrentUserSS()];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (User | null)[] = [null];

  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }

  const user = results[1] as User | null;

  const toggleSidebar = sidebarToggled
    ? sidebarToggled.value.toLocaleLowerCase() == "true" || false
    : false;
  console.log(params.connector);

  return (
    <WrappedSlackPage
      connector={params.connector}
      user={user}
      initiallyToggled={toggleSidebar}
    />
  );
}
