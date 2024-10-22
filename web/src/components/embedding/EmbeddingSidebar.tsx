import { useEmbeddingFormContext } from "@/context/EmbeddingContext";
import { HeaderTitle } from "@/components/header/HeaderTitle";

import { SettingsIcon } from "@/components/icons/icons";
import { Logo } from "@/components/Logo";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import Link from "next/link";
import { useContext } from "react";

export default function EmbeddingSidebar() {
  const { formStep, setFormStep, allowAdvanced, allowCreate } =
    useEmbeddingFormContext();
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const enterpriseSettings = combinedSettings.workspaces;

  const settingSteps = ["Embedding Model", "Reranking Model", "Advanced"];

  return (
    <div className="flex bg-background text-default">
      <div
        className={`flex-none
                  bg-background-100
                  h-screen
                  transition-all
                  bg-opacity-80
                  duration-300
                  ease-in-out
                  w-[250px]
                  right-0 top-0
                  `}
      >
        <div className="fixed h-full right-0 top-0 w-[300px] border-l bg-background">
          <div className="flex items-center my-auto mt-2 ml-4 mr-3 text-xl gap-x-1 text-text-700">
            <div className="w-6 h-6 my-auto mr-1">
              <Logo height={24} width={24} />
            </div>

            <div>
              {enterpriseSettings && enterpriseSettings.workspace_name ? (
                <HeaderTitle>{enterpriseSettings.workspace_name}</HeaderTitle>
              ) : (
                <HeaderTitle>enMedD AI</HeaderTitle>
              )}
            </div>
          </div>

          <div className="mx-3 mt-6 gap-y-1 flex-col flex gap-x-1.5 items-center">
            <Link
              href={"/admin/configuration/search"}
              className="flex items-center w-full p-2 transition-all duration-150 bg-white border rounded cursor-pointer border-border hover:bg-background-200 gap-x-2"
            >
              <SettingsIcon className="flex-none " />
              <p className="flex items-center my-auto text-sm">
                Search Settings
              </p>
            </Link>
          </div>

          <div className="flex h-full">
            <div className="w-full max-w-2xl px-4 py-8 mx-auto">
              <div className="relative">
                <div className="absolute h-[85%] left-[6px] top-[8px] bottom-0 w-0.5 bg-gray-300"></div>
                {settingSteps.map((step, index) => {
                  return (
                    <div
                      key={index}
                      className="relative flex items-center mb-6 cursor-pointer"
                      onClick={() => {
                        setFormStep(index);
                      }}
                    >
                      <div className="z-10 flex-shrink-0 mr-4">
                        <div className="rounded-full h-3.5 w-3.5 flex items-center justify-center bg-blue-500">
                          {formStep === index && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`${index <= formStep ? "text-gray-800" : "text-gray-500"}`}
                      >
                        {step}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
