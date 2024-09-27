"use client";

import { HealthCheckBanner } from "@/components/health/healthcheck";

import Logo from "../../../../public/logo-brand.png";
import Image from "next/image";

import { Progress } from "@/components/ui/progress";
import { SetNewPasswordForms } from "./SetNewPassword";
import { WelcomeTopBar } from "@/components/TopBar";

const Page = () => {
  return (
    <main className="relative h-full px-6">
      <HealthCheckBanner />

      <WelcomeTopBar />

      <div className="flex justify-center items-center h-full">
        <div className="md:w-[500px]">
          <SetNewPasswordForms />
        </div>
      </div>

      <div className="w-full md:w-[500px] flex gap-2 absolute bottom-10 left-1/2 -translate-x-1/2 px-6 md:px-0">
        <Progress value={100} />
        <Progress value={0} />
      </div>
    </main>
  );
};

export default Page;
