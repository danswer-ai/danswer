"use client";

import { HealthCheckBanner } from "@/components/health/healthcheck";

import Logo from "../../../../public/logo-brand.png";
import Image from "next/image";

import { Progress } from "@/components/ui/progress";
import { SetNewPasswordForms } from "./SetNewPassword";

const Page = () => {
  return (
    <main className="relative h-full">
      <HealthCheckBanner />
      <div className="absolute top-6 left-10">
        <Image src={Logo} alt="Logo" className="w-28 xl:w-32" />
      </div>

      <div className="flex justify-center items-center h-full">
        <div className="w-[500px]">
          <SetNewPasswordForms />
        </div>
      </div>

      <div className="w-[500px] flex gap-2 absolute bottom-10 left-1/2 -translate-x-1/2">
        <Progress value={100} />
        <Progress value={0} />
      </div>
    </main>
  );
};

export default Page;
