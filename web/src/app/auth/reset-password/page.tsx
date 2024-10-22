"use client";

import { HealthCheckBanner } from "@/components/health/healthcheck";

import Logo from "../../../../public/logo-brand.png";
import Image from "next/image";

import { Progress } from "@/components/ui/progress";
import { SetNewPasswordForms } from "./SetNewPassword";
import { WelcomeTopBar } from "@/components/TopBar";

const Page = () => {
  return (
    <main className="h-full overflow-y-auto">
      <HealthCheckBanner />

      <div className="w-full h-full flex flex-col justify-between items-center mx-auto">
        <WelcomeTopBar />

        <div className="w-full md:w-[500px] flex items-center justify-center px-6 md:px-0">
          <SetNewPasswordForms />
        </div>

        <div className="w-full md:w-[500px]  flex gap-2 px-6 md:px-0 py-10">
          <Progress value={100} />
          <Progress value={0} />
        </div>
      </div>
    </main>
  );
};

export default Page;
