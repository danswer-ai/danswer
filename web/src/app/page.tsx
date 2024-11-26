import { fetchSettingsSS } from "@/components/settings/lib";
import { redirect } from "next/navigation";

export default async function Page() {
  const settings = await fetchSettingsSS();

  // The default page setting must only be available to authenticated users
  // If the user is not authenticated, they must be redirected to the landing page
  if (!settings) {
    redirect("/chat");
  }

  if (settings.settings.default_page === "search") {
    redirect("/search");
  } else {
    redirect("/chat");
  }

  return <></>;
}
