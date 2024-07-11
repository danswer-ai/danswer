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

import CallToActions from "./homepage/callToActions";
import Certifications from "./homepage/certifications";
import DataLoaders from "./homepage/dataLoaders";
import Enterprise from "./homepage/enterprise";
import Footer from "./homepage/footer";
import Hero from "./homepage/hero";
import Models from "./homepage/models";
import Navbar from "./homepage/navbar";
import Platform from "./homepage/platform";
import UseCases from "./homepage/useCases";

export default async function Page() {
  return (
    <>
      <Navbar />
      <Hero />
      <UseCases />
      <Platform />
      <Models />
      <Enterprise />
      <Certifications />
      <DataLoaders />
      <CallToActions />
      <Footer />
    </>
  );
}
