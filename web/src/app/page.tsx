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

/* import { fetchSettingsSS } from "@/components/settings/lib";
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

  if (!settings) {
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
} */
"use client";

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
import { useEffect } from "react";
import Lenis from "lenis";

export default function Page() {
  /*   const settings = await fetchSettingsSS();

  if (!settings) {
    redirect("/chat");
  } */

  useEffect(() => {
    const lenis = new Lenis();

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  }, []);

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
