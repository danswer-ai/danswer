"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { SuccessChangePassword } from "./steps/Done";
import { EnterVerification } from "./steps/EmailVerification";
import { EnterEmail } from "./steps/EnterEmail";
import { SetNewPassword } from "./steps/SetNewPassword";

const steps = [
  { component: EnterEmail },
  { component: EnterVerification },
  { component: SetNewPassword },
  { component: SuccessChangePassword },
];

export const ForgorPasswordSteps = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="h-full">
      <div className="flex justify-center items-center h-full">
        <div className="w-full md:w-[500px]">
          <CurrentStepComponent goToNextStep={goToNextStep} />
        </div>
      </div>

      <div className="w-full md:w-[500px] flex gap-2 absolute bottom-10 left-1/2 -translate-x-1/2 px-6 md:px-0">
        <Progress value={currentStep >= 0 ? 100 : 0} />
        <Progress value={currentStep >= 1 ? 100 : 0} />
        <Progress value={currentStep >= 2 ? 100 : 0} />
        <Progress value={currentStep >= 3 ? 100 : 0} />
      </div>
    </div>
  );
};
