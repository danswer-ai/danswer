import { HealthCheckBanner } from "@/components/health/healthcheck";
import { User } from "@/lib/types";
import {
  getCurrentUserSS,
  getAuthTypeMetadataSS,
  AuthTypeMetadata,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import Link from "next/link";

import Logo from "../../../../public/logo-brand.png";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import DefaultUserChart from "../../../../public/default-user-chart.png";
import LoginImage from "../../../../public/LoginImage.png";
import GmailIcon from "../../../../public/Gmail.png";
import MicrosoftIcon from "../../../../public/microsoft.svg";
import { Separator } from "@/components/ui/separator";
import { SignupForms } from "../signup/SignupForms";
import { Fingerprint } from "lucide-react";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik } from "formik";
import { Progress } from "@/components/ui/progress";
import { EnterEmail } from "./steps/EnterEmail";
import { EnterVerification } from "./steps/EmailVerification";
import { SetNewPassword } from "./steps/SetNewPassword";
import { SuccessChangePassword } from "./steps/Done";
import { ForgorPasswordSteps } from "./ForgorPasswordSteps";

const Page = async () => {
  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let authTypeMetadata: AuthTypeMetadata | null = null;
  let currentUser: User | null = null;
  try {
    [authTypeMetadata, currentUser] = await Promise.all([
      getAuthTypeMetadataSS(),
      getCurrentUserSS(),
    ]);
  } catch (e) {
    console.log(`Some fetch failed for the login page - ${e}`);
  }

  // simply take the user to the home page if Auth is disabled
  if (authTypeMetadata?.authType === "disabled") {
    return redirect("/");
  }

  // if user is already logged in, take them to the main app page
  if (currentUser && currentUser.is_active) {
    if (!authTypeMetadata?.requiresVerification || currentUser.is_verified) {
      return redirect("/");
    }
    return redirect("/auth/waiting-on-verification");
  }

  // only enable this page if basic login is enabled
  if (authTypeMetadata?.authType !== "basic") {
    return redirect("/");
  }

  return (
    <main className="relative h-full px-6 md:px-0">
      <HealthCheckBanner />
      <div className="absolute top-6 left-10">
        <Image src={Logo} alt="Logo" className="w-28 xl:w-32" />
      </div>

      <ForgorPasswordSteps />
    </main>
  );
};

export default Page;
