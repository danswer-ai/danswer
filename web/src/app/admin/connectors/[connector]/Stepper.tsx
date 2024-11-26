import { useFormContext } from "@/context/FormContext";
import { HeaderTitle } from "@/components/header/HeaderTitle";

import { BackIcon, SettingsIcon } from "@/components/icons/icons";
import { Logo } from "@/components/Logo";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { credentialTemplates } from "@/lib/connectors/credentials";
import Link from "next/link";
import { useUser } from "@/components/user/UserProvider";
import { useContext } from "react";

export default function Stepper() {
  const { formStep, setFormStep, connector, allowAdvanced, allowCreate } =
    useFormContext();
  const combinedSettings = useContext(SettingsContext);
  const { isLoadingUser, isAdmin } = useUser();
  if (!combinedSettings) {
    return null;
  }
  const enterpriseSettings = combinedSettings.workspaces;
  const noCredential = credentialTemplates[connector] == null;

  const settingSteps = [
    ...(!noCredential ? ["Credential"] : []),
    "Connector",
    ...(connector == "file" ? [] : ["Advanced (optional)"]),
  ];

  return (
    <div className="relative lg:flex justify-between w-full hidden">
      {settingSteps.map((step, index) => {
        const allowed =
          (step == "Connector" && allowCreate) ||
          (step == "Advanced (optional)" && allowAdvanced) ||
          index <= formStep;

        return (
          <div
            key={index}
            className={`flex items-start mb-6 text-sm ${
              !allowed ? "cursor-not-allowed" : "cursor-pointer"
            } ${index !== settingSteps.length - 1 ? "w-full" : ""}`}
            onClick={() => {
              if (allowed) {
                setFormStep(index - (noCredential ? 1 : 0));
              }
            }}
          >
            <div className="z-10 flex-shrink-0 mt-[3px] mr-4">
              <div
                className={`rounded-full h-3.5 w-3.5 flex items-center justify-center ${
                  allowed ? "bg-brand-500" : "bg-secondary-500"
                }`}
              >
                {formStep === index && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </div>
            <div
              className={`text-center ${
                index <= formStep ? "text-gray-800" : "text-gray-500"
              }`}
            >
              {step}
            </div>

            {index !== settingSteps.length - 1 && (
              <div
                className={`w-full h-2 mx-4 mt-1.5 rounded-pill ${allowed ? "bg-brand-500" : "bg-secondary-500"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
