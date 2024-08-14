import { fetchSettingsSS } from "@/components/settings/lib";
import { redirect } from "next/navigation";
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
