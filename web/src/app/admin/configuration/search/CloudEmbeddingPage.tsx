"use client";

import { Button, Text, Title } from "@tremor/react";

import {
  CloudEmbeddingProvider,
  CloudEmbeddingModel,
  AVAILABLE_CLOUD_PROVIDERS,
  CloudEmbeddingProviderFull,
  EmbeddingModelDescriptor,
} from "./components/types";
import { EmbeddingDetails } from "./page";
import { FiExternalLink, FiInfo } from "react-icons/fi";
import { HoverPopup } from "@/components/HoverPopup";
import { Dispatch, SetStateAction } from "react";
import { GearIcon } from "@/components/icons/icons";

export default function CloudEmbeddingPage({
  currentModel,
  embeddingProviderDetails,
  newEnabledProviders,
  newUnenabledProviders,
  setShowTentativeProvider,
  setChangeCredentialsProvider,
  setAlreadySelectedModel,
  setShowTentativeModel,
  setShowModelInQueue,
}: {
  setShowModelInQueue: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowTentativeModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  currentModel: EmbeddingModelDescriptor | CloudEmbeddingModel;
  setAlreadySelectedModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  newUnenabledProviders: string[];
  embeddingProviderDetails?: EmbeddingDetails[];
  newEnabledProviders: string[];
  selectedModel: CloudEmbeddingProvider;
  setShowTentativeProvider: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
  setChangeCredentialsProvider: React.Dispatch<
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

  let providers: CloudEmbeddingProviderFull[] = AVAILABLE_CLOUD_PROVIDERS.map(
    (model) => ({
      ...model,
      configured:
        !newUnenabledProviders.includes(model.name) &&
        (newEnabledProviders.includes(model.name) ||
          (embeddingProviderDetails &&
            hasNameInArray(embeddingProviderDetails, model.name))!),
    })
  );

  return (
    <div>
      <Title className="mt-8">
        Here are some cloud-based models to choose from.
      </Title>
      <Text className="mb-4">
        They require API keys and run in the clouds of the respective providers.
      </Text>

      <div className="gap-4 mt-2 pb-10 flex content-start flex-wrap">
        {providers.map((provider) => (
          <div key={provider.name} className="mt-4 w-full">
            <div className="flex items-center mb-2">
              {provider.icon({ size: 40 })}
              <h2 className="ml-2  mt-2 text-xl font-bold">
                {provider.name} {provider.name == "Cohere" && "(preferred)"}
              </h2>
              <HoverPopup
                mainContent={
                  <FiInfo className="ml-2 mt-2 cursor-pointer" size={18} />
                }
                popupContent={
                  <div className="text-sm text-text-800 w-52">
                    <div className="my-auto">{provider.description}</div>
                  </div>
                }
                style="dark"
              />
            </div>

            <button
              onClick={() => {
                if (!provider.configured) {
                  setShowTentativeProvider(provider);
                } else {
                  setChangeCredentialsProvider(provider);
                }
              }}
              className="mb-2  hover:underline text-sm cursor-pointer"
            >
              {provider.configured
                ? "Modify credentials"
                : "Configure provider"}
            </button>
            <div className="flex flex-wrap gap-4">
              {provider.embedding_models.map((model) => (
                <CloudModelCard
                  key={model.model_name}
                  model={model}
                  provider={provider}
                  currentModel={currentModel}
                  setAlreadySelectedModel={setAlreadySelectedModel}
                  setShowTentativeModel={setShowTentativeModel}
                  setShowModelInQueue={setShowModelInQueue}
                  setShowTentativeProvider={setShowTentativeProvider}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CloudModelCard({
  model,
  provider,
  currentModel,
  setAlreadySelectedModel,
  setShowTentativeModel,
  setShowModelInQueue,
  setShowTentativeProvider,
}: {
  model: CloudEmbeddingModel;
  provider: CloudEmbeddingProviderFull;
  currentModel: EmbeddingModelDescriptor | CloudEmbeddingModel;
  setAlreadySelectedModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowTentativeModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowModelInQueue: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
  setShowTentativeProvider: React.Dispatch<
    React.SetStateAction<CloudEmbeddingProvider | null>
  >;
}) {
  const enabled = model.model_name === currentModel.model_name;

  return (
    <div
      className={`p-4 w-96 border rounded-lg transition-all duration-200 ${
        enabled
          ? "border-blue-500 bg-blue-50 shadow-md"
          : "border-gray-300 hover:border-blue-300 hover:shadow-sm"
      } ${!provider.configured && "opacity-80 hover:opacity-100"}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">{model.model_name}</h3>
        <a
          href={provider.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
        >
          <FiExternalLink size={18} />
        </a>
      </div>
      <p className="text-sm text-gray-600 mb-2">{model.description}</p>
      <div className="text-xs text-gray-500 mb-2">
        ${model.pricePerMillion}/M tokens
      </div>
      <div className="mt-3">
        <button
          className={`w-full p-2 rounded-lg text-sm ${
            enabled
              ? "bg-background-125 border border-border cursor-not-allowed"
              : "bg-background border border-border hover:bg-hover cursor-pointer"
          }`}
          onClick={() => {
            if (enabled) {
              setAlreadySelectedModel(model);
            } else if (provider.configured) {
              setShowTentativeModel(model);
            } else {
              setShowModelInQueue(model);
              setShowTentativeProvider(provider);
            }
          }}
          disabled={enabled}
        >
          {enabled ? "Selected Model" : "Select Model"}
        </button>
      </div>
    </div>
  );
}
// export default function CloudEmbeddingPage({
//   currentModel,
//   embeddingProviderDetails,
//   newEnabledProviders,
//   newUnenabledProviders,
//   setShowTentativeProvider,
//   setChangeCredentialsProvider,
//   setAlreadySelectedModel,
//   setShowTentativeModel,
//   setShowModelInQueue,
// }: {
//   setShowModelInQueue: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
//   setShowTentativeModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
//   currentModel: EmbeddingModelDescriptor | CloudEmbeddingModel;
//   setAlreadySelectedModel: Dispatch<SetStateAction<CloudEmbeddingModel | null>>;
//   newUnenabledProviders: string[];
//   embeddingProviderDetails?: EmbeddingDetails[];
//   newEnabledProviders: string[];
//   selectedModel: CloudEmbeddingProvider;

//   setShowTentativeProvider: React.Dispatch<
//     React.SetStateAction<CloudEmbeddingProvider | null>
//   >;
//   setChangeCredentialsProvider: React.Dispatch<
//     React.SetStateAction<CloudEmbeddingProvider | null>
//   >;
// }) {
//   function hasNameInArray(
//     arr: Array<{ name: string }>,
//     searchName: string
//   ): boolean {
//     return arr.some(
//       (item) => item.name.toLowerCase() === searchName.toLowerCase()
//     );
//   }

//   let providers: CloudEmbeddingProviderFull[] = [];
//   AVAILABLE_CLOUD_PROVIDERS.forEach((model, ind) => {
//     let temporary_model: CloudEmbeddingProviderFull = {
//       ...model,
//       configured:
//         !newUnenabledProviders.includes(model.name) &&
//         (newEnabledProviders.includes(model.name) ||
//           (embeddingProviderDetails &&
//             hasNameInArray(embeddingProviderDetails, model.name))!),
//     };
//     providers.push(temporary_model);
//   });

//   return (
//     <div>
//       <Title className="mt-8">
//         Here are some cloud-based models to choose from.
//       </Title>
//       <Text className="mb-4">
//         They require API keys and run in the clouds of the respective providers.
//       </Text>

//       <div className="gap-4 mt-2 pb-10 flex content-start flex-wrap">
//         {providers.map((provider, ind) => (
//           <div
//             key={ind}
//             className="p-4 border border-border rounded-lg shadow-md bg-hover-light w-96 flex flex-col"
//           >
//             <div className="font-bold text-text-900 text-lg items-center py-1 gap-x-2 flex">
//               {provider.icon({ size: 40 })}
//               <p className="my-auto">{provider.name}</p>
//               <button
//                 onClick={() => {
//                   setShowTentativeProvider(provider);
//                 }}
//                 className="cursor-pointer ml-auto"
//               >
//                 <a className="my-auto hover:underline cursor-pointer">
//                   <HoverPopup
//                     mainContent={
//                       <FiInfo className="cusror-pointer" size={20} />
//                     }
//                     popupContent={
//                       <div className="text-sm text-text-800 w-52 flex">
//                         <div className="flex mx-auto">
//                           <div className="my-auto">{provider.description}</div>
//                         </div>
//                       </div>
//                     }
//                     direction="left-top"
//                     style="dark"
//                   />
//                 </a>
//               </button>
//             </div>

//             <div>
//               {provider.embedding_models.map((model, index) => {
//                 const enabled = model.model_name == currentModel.model_name;

//                 return (
//                   <div
//                     key={index}
//                     className={`p-3 my-2 border-2 border-border-medium border-opacity-40 rounded-md rounded cursor-pointer
//                     ${!provider.configured
//                         ? "opacity-80 hover:opacity-100"
//                         : enabled
//                           ? "bg-background-200"
//                           : "hover:bg-background-500"
//                       }`}
//                     onClick={() => {
//                       if (enabled) {
//                         setAlreadySelectedModel(model);
//                       } else if (provider.configured) {
//                         setShowTentativeModel(model);
//                       } else {
//                         setShowModelInQueue(model);
//                         setShowTentativeProvider(provider);
//                       }
//                     }}
//                   >
//                     <div className="flex justify-between">
//                       <div className="font-medium text-sm">
//                         {model.model_name}
//                       </div>
//                       <p className="text-sm flex-none">
//                         ${model.pricePerMillion}/M tokens
//                       </p>
//                     </div>
//                     <div className="text-sm text-gray-600">
//                       {model.description}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//             <button
//               onClick={() => {
//                 if (!provider.configured) {
//                   setShowTentativeProvider(provider);
//                 } else {
//                   setChangeCredentialsProvider(provider);
//                 }
//               }}
//               className="hover:underline mb-1 text-sm mr-auto cursor-pointer"
//             >
//               {provider.configured && "Modify credentials"}
//             </button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
