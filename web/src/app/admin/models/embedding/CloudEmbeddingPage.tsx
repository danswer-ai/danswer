"use client";

import { Title } from "@tremor/react";

import {
  CloudEmbeddingProvider,
  CloudEmbeddingModel,
  AVAILABLE_CLOUD_MODELS,
  CloudEmbeddingProviderFull,
} from "./components/types";
import { FaLock } from "react-icons/fa";
import { EmbeddingDetails } from "./page";
import { FiInfo, FiRadio } from "react-icons/fi";
import { HoverPopup } from "@/components/HoverPopup";
import { Dispatch, SetStateAction } from "react";

export default function CloudEmbeddingPage({
  embeddingProviderDetails,
  newEnabledProviders,
  newUnenabledProviders,
  setTentativeNewEmbeddingModel,
  setTentativelyNewProvider,
  selectedModel,
  setShowModelNotConfiguredModal,
  setChangeCredentials,
  setAlreadyPicked,
}: {
  setAlreadyPicked: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  newUnenabledProviders: string[];
  embeddingProviderDetails?: EmbeddingDetails[];
  newEnabledProviders: string[];
  selectedModel: CloudEmbeddingProvider;
  setTentativeNewEmbeddingModel: React.Dispatch<
    React.SetStateAction<CloudEmbeddingModel | null>
  >;
  setTentativelyNewProvider: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
  setShowModelNotConfiguredModal: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
  setChangeCredentials: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
}) {
  function hasNameInArray(
    arr: Array<{ name: string }>,
    searchName: string
  ): boolean {
    return arr.some(
      (item) => item.name.toLowerCase() === searchName.toLowerCase()
    );
  }

  let providers: CloudEmbeddingProviderFull[] = [];
  AVAILABLE_CLOUD_MODELS.forEach((model, ind) => {
    let temporary_model: CloudEmbeddingProviderFull = {
      ...model,
      configured:
        !newUnenabledProviders.includes(model.name) &&
        (newEnabledProviders.includes(model.name) ||
          (embeddingProviderDetails &&
            hasNameInArray(embeddingProviderDetails, model.name))!),
    };
    providers.push(temporary_model);
  });

  return (
    <div>
      <div className="gap-4 mt-2 pb-10 flex content-start flex-wrap">
        {providers.map((provider, ind) => (
          <div
            key={ind}
            className="p-4 border border-border rounded-lg shadow-md bg-hover-light w-96 flex flex-col"
          >
            <div className="font-bold text-neutral-900 text-lg items-center py-1 gap-x-2 flex">
              {provider.icon({ size: 40 })}
              <p className="my-auto">{provider.name}</p>
              <button
                onClick={() => {
                  console.log(provider);
                  setTentativelyNewProvider(provider);
                }}
                className="cursor-pointer ml-auto"
              >
                <a className="my-auto hover:underline cursor-pointer">
                  <HoverPopup
                    mainContent={
                      <FiInfo className="cusror-pointer" size={20} />
                    }
                    popupContent={
                      <div className="text-sm text-neutral-800 w-52 flex">
                        <div className="flex mx-auto">
                          <div className="my-auto">{provider.description}</div>
                        </div>
                      </div>
                    }
                    direction="left-top"
                    style="dark"
                  />
                </a>
                {/* {!provider.configured &&
                
                 
                  //  <FaLock />
                } */}
              </button>
            </div>
            <button
              onClick={() => {
                if (!provider.configured) {
                  setTentativelyNewProvider(provider);
                } else {
                  setChangeCredentials(provider);
                }
              }}
              className="hover:underline my-2 mr-auto cursor-pointer"
            >
              {provider.configured
                ? "Modify credentials"
                : "Configure credentials"}
            </button>
            {/* <div>{provider.description}</div> */}

            <div>
              {provider.embedding_models.map((model, index) => (
                <div
                  key={index}
                  className={`p-3 mb-2 border-2 border-neutral-300 border-opacity-40 rounded-md rounded cursor-pointer  
                    ${model.enabled ? "bg-background-stronger" : "hover:bg-background-strong"} 
                    ${
                      provider.configured
                      // ? selectedModel?.name === model.name
                      // ? "bg-teal-50 border border-blue-300"
                      // : "hover:bg-blue-50"
                      // : "hover:bg-rose-50"
                    }`}
                  onClick={() => {
                    if (model.enabled) {
                      setAlreadyPicked(model);
                    } else if (!provider.configured) {
                      setShowModelNotConfiguredModal(provider);
                    } else {
                      setTentativeNewEmbeddingModel(model);
                    }
                  }}
                >
                  <div className="flex justify-between">
                    <div className="font-medium">{model.name}</div>
                    {/* <p className="text-sm flex-none">
                      {provider.configured
                        ? model.enabled
                          ? "Selected"
                          : "Unselected"
                        : "Unconfigured"}
                    </p> */}
                    <p className="text-sm flex-none">
                      ${model.pricePerMillion}/M tokens
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {model.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm font-semibold flex justify-between mt-1 mx-2">
              {/* <a className="hover:underline cursor-pointer">Learn more</a> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
