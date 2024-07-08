/* import { fetchSettingsSS } from "@/components/settings/lib";
import { redirect } from "next/navigation";

export default async function Page() {
  const settings = await fetchSettingsSS();

  if (!settings) {
    redirect("/search");
  }

  if (settings.settings.default_page === "search") {
    redirect("/search");
  } else {
    redirect("/chat");
  }
} */

import Hero from "./homepage/hero";
import Navbar from "./homepage/navbar";
import Platform from "./homepage/platform";
import UseCases from "./homepage/useCases";

export default async function Page() {
  return (
    <div>
      <Navbar />
      <Hero />
      <UseCases />
      <Platform />
    </div>
  );
}
