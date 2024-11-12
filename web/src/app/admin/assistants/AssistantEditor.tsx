"use client";

import { generateRandomIconShape, createSVG } from "@/lib/assistantIconUtils";

import { CCPairBasicInfo, DocumentSet, User } from "@/lib/types";
import { Divider } from "@tremor/react";
import { IsPublicGroupSelector } from "@/components/IsPublicGroupSelector";
import {
  ArrayHelpers,
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
  FormikProps,
} from "formik";

import {
  BooleanFormField,
  Label,
  SelectorFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { getDisplayNameForModel } from "@/lib/hooks";
import { DocumentSetSelectable } from "@/components/documentSet/DocumentSetSelectable";
import { Option } from "@/components/Dropdown";
import { addAssistantToList } from "@/lib/assistants/updateAssistantPreferences";
import { checkLLMSupportsImageOutput, destructureValue } from "@/lib/llm/utils";
import { ToolSnapshot } from "@/lib/tools/interfaces";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiInfo, FiX } from "react-icons/fi";
import * as Yup from "yup";
import { FullLLMProvider } from "../configuration/llm/interfaces";
import CollapsibleSection from "./CollapsibleSection";
import { SuccessfulAssistantUpdateRedirectType } from "./enums";
import { Assistant, StarterMessage } from "./interfaces";
import {
  buildFinalPrompt,
  createAssistant,
  providersContainImageGeneratingSupport,
  updateAssistant,
} from "./lib";
import { Popover } from "@/components/popover/Popover";
import {
  CameraIcon,
  NewChatIcon,
  SwapIcon,
  TrashIcon,
} from "@/components/icons/icons";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";
import { buildImgUrl } from "@/app/chat/files/images/utils";
import { LlmList } from "@/components/llm/LLMList";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function findSearchTool(tools: ToolSnapshot[]) {
  return tools.find((tool) => tool.in_code_tool_id === "SearchTool");
}

function findImageGenerationTool(tools: ToolSnapshot[]) {
  return tools.find((tool) => tool.in_code_tool_id === "ImageGenerationTool");
}

function findInternetSearchTool(tools: ToolSnapshot[]) {
  return tools.find((tool) => tool.in_code_tool_id === "InternetSearchTool");
}

function SubLabel({ children }: { children: string | JSX.Element }) {
  return <span className="mb-2 text-sm text-subtle">{children}</span>;
}

export function AssistantEditor({
  existingAssistant,
  ccPairs,
  documentSets,
  user,
  defaultPublic,
  redirectType,
  llmProviders,
  tools,
  shouldAddAssistantToUserPreferences,
  admin,
  teamspaceId,
}: {
  existingAssistant?: Assistant | null;
  ccPairs: CCPairBasicInfo[];
  documentSets: DocumentSet[];
  user: User | null;
  defaultPublic: boolean;
  redirectType: SuccessfulAssistantUpdateRedirectType;
  llmProviders: FullLLMProvider[];
  tools: ToolSnapshot[];
  shouldAddAssistantToUserPreferences?: boolean;
  admin?: boolean;
  teamspaceId?: string | string[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const colorOptions = [
    "#FF6FBF",
    "#6FB1FF",
    "#B76FFF",
    "#FFB56F",
    "#6FFF8D",
    "#FF6F6F",
    "#6FFFFF",
  ];

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // state to persist across formik reformatting
  const [defautIconColor, _setDeafultIconColor] = useState(
    colorOptions[Math.floor(Math.random() * colorOptions.length)]
  );

  const [defaultIconShape, setDefaultIconShape] = useState<any>(null);

  useEffect(() => {
    if (defaultIconShape === null) {
      setDefaultIconShape(generateRandomIconShape().encodedGrid);
    }
  }, []);

  const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);

  const [finalPrompt, setFinalPrompt] = useState<string | null>("");
  const [finalPromptError, setFinalPromptError] = useState<string>("");
  const [removeAssistantImage, setRemoveAssistantImage] = useState(false);

  const triggerFinalPromptUpdate = async (
    systemPrompt: string,
    taskPrompt: string,
    retrievalDisabled: boolean
  ) => {
    const response = await buildFinalPrompt(
      systemPrompt,
      taskPrompt,
      retrievalDisabled
    );
    if (response.ok) {
      setFinalPrompt((await response.json()).final_prompt_template);
    }
  };

  const isUpdate =
    existingAssistant !== undefined && existingAssistant !== null;
  const existingPrompt = existingAssistant?.prompts[0] ?? null;

  useEffect(() => {
    if (isUpdate && existingPrompt) {
      triggerFinalPromptUpdate(
        existingPrompt.system_prompt,
        existingPrompt.task_prompt,
        existingAssistant.num_chunks === 0
      );
    }
  }, []);

  const defaultProvider = llmProviders.find(
    (llmProvider) => llmProvider.is_default_provider
  );
  const defaultProviderName = defaultProvider?.provider;
  const defaultModelName = defaultProvider?.default_model_name;
  const providerDisplayNameToProviderName = new Map<string, string>();
  llmProviders.forEach((llmProvider) => {
    providerDisplayNameToProviderName.set(
      llmProvider.name,
      llmProvider.provider
    );
  });

  const modelOptionsByProvider = new Map<string, Option<string>[]>();
  llmProviders.forEach((llmProvider) => {
    const providerOptions = llmProvider.model_names.map((modelName) => {
      return {
        name: getDisplayNameForModel(modelName),
        value: modelName,
      };
    });
    modelOptionsByProvider.set(llmProvider.name, providerOptions);
  });

  const providerSupportingImageGenerationExists =
    providersContainImageGeneratingSupport(llmProviders);

  const assistantCurrentToolIds =
    existingAssistant?.tools.map((tool) => tool.id) || [];
  const searchTool = findSearchTool(tools);
  const imageGenerationTool = providerSupportingImageGenerationExists
    ? findImageGenerationTool(tools)
    : undefined;
  const internetSearchTool = findInternetSearchTool(tools);

  const customTools = tools.filter(
    (tool) =>
      tool.in_code_tool_id !== searchTool?.in_code_tool_id &&
      tool.in_code_tool_id !== imageGenerationTool?.in_code_tool_id &&
      tool.in_code_tool_id !== internetSearchTool?.in_code_tool_id
  );

  const availableTools = [
    ...customTools,
    ...(searchTool ? [searchTool] : []),
    ...(imageGenerationTool ? [imageGenerationTool] : []),
    ...(internetSearchTool ? [internetSearchTool] : []),
  ];
  const enabledToolsMap: { [key: number]: boolean } = {};
  availableTools.forEach((tool) => {
    enabledToolsMap[tool.id] = assistantCurrentToolIds.includes(tool.id);
  });

  const initialValues = {
    name: existingAssistant?.name ?? "",
    description: existingAssistant?.description ?? "",
    system_prompt: existingPrompt?.system_prompt ?? "",
    task_prompt: existingPrompt?.task_prompt ?? "",
    is_public: existingAssistant?.is_public ?? defaultPublic,
    document_set_ids:
      existingAssistant?.document_sets?.map((documentSet) => documentSet.id) ??
      ([] as number[]),
    num_chunks: existingAssistant?.num_chunks ?? null,
    search_start_date: existingAssistant?.search_start_date
      ? existingAssistant?.search_start_date.toString().split("T")[0]
      : null,
    include_citations: existingAssistant?.prompts[0]?.include_citations ?? true,
    llm_relevance_filter: existingAssistant?.llm_relevance_filter ?? false,
    llm_model_provider_override:
      existingAssistant?.llm_model_provider_override ?? null,
    llm_model_version_override:
      existingAssistant?.llm_model_version_override ?? null,
    starter_messages: existingAssistant?.starter_messages ?? [],
    enabled_tools_map: enabledToolsMap,
    icon_color: existingAssistant?.icon_color ?? defautIconColor,
    icon_shape: existingAssistant?.icon_shape ?? defaultIconShape,
    uploaded_image: null,

    // EE Only
    groups: existingAssistant?.groups ?? [],
  };

  const [isRequestSuccessful, setIsRequestSuccessful] = useState(false);

  async function checkAssistantNameExists(name: string) {
    const response = await fetch(`/api/assistant`);
    const data = await response.json();

    const assistantNameExists = data.some(
      (assistant: Assistant) => assistant.name === name
    );

    return assistantNameExists;
  }

  return (
    <div>
      <Formik
        enableReinitialize={true}
        initialValues={initialValues}
        validationSchema={Yup.object()
          .shape({
            name: Yup.string().required(
              "Must provide a name for the Assistant"
            ),
            description: Yup.string().required(
              "Must provide a description for the Assistant"
            ),
            system_prompt: Yup.string(),
            task_prompt: Yup.string(),
            is_public: Yup.boolean().required(),
            document_set_ids: Yup.array().of(Yup.number()),
            num_chunks: Yup.number().nullable(),
            include_citations: Yup.boolean().required(),
            llm_relevance_filter: Yup.boolean().required(),
            llm_model_version_override: Yup.string().nullable(),
            llm_model_provider_override: Yup.string().nullable(),
            starter_messages: Yup.array().of(
              Yup.object().shape({
                name: Yup.string().required(
                  "Each starter message must have a name"
                ),
                description: Yup.string().required(
                  "Each starter message must have a description"
                ),
                message: Yup.string().required(
                  "Each starter message must have a message"
                ),
              })
            ),
            search_start_date: Yup.date().nullable(),
            icon_color: Yup.string(),
            icon_shape: Yup.number(),
            uploaded_image: Yup.mixed().nullable(),
            // EE Only
            groups: Yup.array().of(Yup.number()),
          })
          .test(
            "system-prompt-or-task-prompt",
            "Must provide either Instructions or Reminders (Advanced)",
            function (values) {
              const systemPromptSpecified =
                values.system_prompt && values.system_prompt.trim().length > 0;
              const taskPromptSpecified =
                values.task_prompt && values.task_prompt.trim().length > 0;

              if (systemPromptSpecified || taskPromptSpecified) {
                return true;
              }

              return this.createError({
                path: "system_prompt",
                message:
                  "Must provide either Instructions or Reminders (Advanced)",
              });
            }
          )}
        onSubmit={async (values, formikHelpers) => {
          if (finalPromptError) {
            toast({
              title: "Submission Blocked",
              description:
                "Please resolve the errors in the form before submitting.",
              variant: "destructive",
            });
            return;
          }

          if (
            values.llm_model_provider_override &&
            !values.llm_model_version_override
          ) {
            toast({
              title: "Model Selection Required",
              description:
                "Please select a model when choosing a non-default LLM provider.",
              variant: "destructive",
            });
            return;
          }

          if (!isUpdate) {
            const assistantNameExists = await checkAssistantNameExists(
              values.name
            );
            if (assistantNameExists) {
              toast({
                title: "Assistant Name Taken",
                description: `"${values.name}" is already taken. Please choose a different name.`,
                variant: "destructive",
              });
              formikHelpers.setSubmitting(false);
              return;
            }
          }

          formikHelpers.setSubmitting(true);
          let enabledTools = Object.keys(values.enabled_tools_map)
            .map((toolId) => Number(toolId))
            .filter((toolId) => values.enabled_tools_map[toolId]);
          const searchToolEnabled = searchTool
            ? enabledTools.includes(searchTool.id)
            : false;
          const imageGenerationToolEnabled = imageGenerationTool
            ? enabledTools.includes(imageGenerationTool.id)
            : false;

          if (imageGenerationToolEnabled) {
            if (
              !checkLLMSupportsImageOutput(
                providerDisplayNameToProviderName.get(
                  values.llm_model_provider_override || ""
                ) ||
                  defaultProviderName ||
                  "",
                values.llm_model_version_override || defaultModelName || ""
              )
            ) {
              enabledTools = enabledTools.filter(
                (toolId) => toolId !== imageGenerationTool!.id
              );
            }
          }

          // if disable_retrieval is set, set num_chunks to 0
          // to tell the backend to not fetch any documents
          const numChunks = searchToolEnabled ? values.num_chunks || 10 : 0;

          // don't set teamspace if marked as public
          const isPublic = teamspaceId ? false : values.is_public;
          const groups = teamspaceId
            ? [Number(teamspaceId)]
            : isPublic
              ? []
              : values.groups;

          let promptResponse;
          let assistantResponse;
          if (isUpdate) {
            [promptResponse, assistantResponse] = await updateAssistant({
              id: existingAssistant.id,
              existingPromptId: existingPrompt?.id,
              ...values,
              is_public: isPublic,
              search_start_date: values.search_start_date
                ? new Date(values.search_start_date)
                : null,
              num_chunks: numChunks,
              // users:
              //   user && !checkUserIsNoAuthUser(user.id) ? [user.id] : undefined,
              users: undefined,
              groups,
              tool_ids: enabledTools,
              remove_image: removeAssistantImage,
            });
          } else {
            [promptResponse, assistantResponse] = await createAssistant({
              ...values,
              is_public: isPublic,
              is_default_assistant: admin!,
              num_chunks: numChunks,
              search_start_date: values.search_start_date
                ? new Date(values.search_start_date)
                : null,
              // users:
              //   user && !checkUserIsNoAuthUser(user.id) ? [user.id] : undefined,
              users: undefined,
              groups,
              tool_ids: enabledTools,
            });
          }

          let error = null;
          if (!promptResponse.ok) {
            error = await promptResponse.text();
          }
          if (!assistantResponse) {
            error = "Failed to create Assistant - no response received";
          } else if (!assistantResponse.ok) {
            error = await assistantResponse.text();
          }

          if (error || !assistantResponse) {
            toast({
              title: "Assistant Creation Failed",
              description: `Failed to create Assistant - ${error}`,
              variant: "destructive",
            });
            formikHelpers.setSubmitting(false);
          } else {
            const assistant = await assistantResponse.json();
            const assistantId = assistant.id;
            if (
              shouldAddAssistantToUserPreferences &&
              user?.preferences?.chosen_assistants
            ) {
              const success = await addAssistantToList(assistantId);
              if (success) {
                toast({
                  title: "Assistant Added",
                  description: `"${assistant.name}" has been added to your list.`,
                  variant: "success",
                });

                router.refresh();
              } else {
                toast({
                  title: "Failed to Add Assistant",
                  description: `"${assistant.name}" could not be added to your list.`,
                  variant: "destructive",
                });
              }
            }
            const redirectUrl =
              redirectType === SuccessfulAssistantUpdateRedirectType.ADMIN
                ? teamspaceId
                  ? `/t/${teamspaceId}/admin/assistants?u=${Date.now()}`
                  : `/admin/assistants?u=${Date.now()}`
                : teamspaceId
                  ? `/t/${teamspaceId}/chat?assistantId=${assistantId}`
                  : `/chat?assistantId=${assistantId}`;

            router.push(redirectUrl);
            setIsRequestSuccessful(true);
          }
        }}
      >
        {({
          isSubmitting,
          values,
          setFieldValue,
          ...formikProps
        }: FormikProps<any>) => {
          function toggleToolInValues(toolId: number) {
            const updatedEnabledToolsMap = {
              ...values.enabled_tools_map,
              [toolId]: !values.enabled_tools_map[toolId],
            };
            setFieldValue("enabled_tools_map", updatedEnabledToolsMap);
          }

          function searchToolEnabled() {
            return searchTool && values.enabled_tools_map[searchTool.id]
              ? true
              : false;
          }

          const currentLLMSupportsImageOutput = checkLLMSupportsImageOutput(
            providerDisplayNameToProviderName.get(
              values.llm_model_provider_override || ""
            ) ||
              defaultProviderName ||
              "",
            values.llm_model_version_override || defaultModelName || ""
          );

          return (
            <Form className="w-full text-text-950">
              <div className="flex justify-center w-full gap-x-2">
                <Popover
                  open={isIconDropdownOpen}
                  onOpenChange={setIsIconDropdownOpen}
                  content={
                    <div
                      className="flex p-1 border border-2 border-dashed rounded-full cursor-pointer border-border"
                      style={{
                        borderStyle: "dashed",
                        borderWidth: "1.5px",
                        borderSpacing: "4px",
                      }}
                      onClick={() => setIsIconDropdownOpen(!isIconDropdownOpen)}
                    >
                      {values.uploaded_image ? (
                        <img
                          src={URL.createObjectURL(values.uploaded_image)}
                          alt="Uploaded assistant icon"
                          className="object-cover w-12 h-12 rounded-full"
                        />
                      ) : existingAssistant?.uploaded_image_id &&
                        !removeAssistantImage ? (
                        <img
                          src={buildImgUrl(
                            existingAssistant?.uploaded_image_id
                          )}
                          alt="Uploaded assistant icon"
                          className="object-cover w-12 h-12 rounded-full"
                        />
                      ) : (
                        createSVG(
                          {
                            encodedGrid: values.icon_shape,
                            filledSquares: 0,
                          },
                          values.icon_color,
                          undefined,
                          true
                        )
                      )}
                    </div>
                  }
                  popover={
                    <div className="bg-white text-text-800 flex flex-col gap-y-1 w-[300px] border border-border rounded-lg shadow-lg p-2">
                      <label className="flex items-center w-full px-4 py-2 text-left rounded cursor-pointer gap-x-2 hover:bg-background-100">
                        <CameraIcon />
                        Upload {values.uploaded_image && " New "} Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFieldValue("uploaded_image", file);
                              setIsIconDropdownOpen(false);
                            }
                          }}
                        />
                      </label>

                      {values.uploaded_image && (
                        <Button
                          onClick={() => {
                            setFieldValue("uploaded_image", null);
                            setRemoveAssistantImage(false);
                          }}
                          variant="destructive"
                          type="button"
                        >
                          <TrashIcon />
                          {removeAssistantImage
                            ? "Revert to Previous "
                            : "Remove "}
                          Image
                        </Button>
                      )}

                      {!values.uploaded_image &&
                        (!existingAssistant?.uploaded_image_id ||
                          removeAssistantImage) && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newShape = generateRandomIconShape();
                              const randomColor =
                                colorOptions[
                                  Math.floor(
                                    Math.random() * colorOptions.length
                                  )
                                ];
                              setFieldValue("icon_shape", newShape.encodedGrid);
                              setFieldValue("icon_color", randomColor);
                            }}
                            type="button"
                          >
                            <NewChatIcon />
                            Generate New Icon
                          </Button>
                        )}

                      {existingAssistant?.uploaded_image_id &&
                        removeAssistantImage &&
                        !values.uploaded_image && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRemoveAssistantImage(false);
                              setFieldValue("uploaded_image", null);
                            }}
                            type="button"
                          >
                            <SwapIcon />
                            Revert to Previous Image
                          </Button>
                        )}

                      {existingAssistant?.uploaded_image_id &&
                        !removeAssistantImage &&
                        !values.uploaded_image && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRemoveAssistantImage(true);
                            }}
                            variant="destructive"
                            type="button"
                          >
                            <TrashIcon />
                            Remove Image
                          </Button>
                        )}
                    </div>
                  }
                  align="start"
                  side="bottom"
                />

                <CustomTooltip trigger={<FiInfo size={12} />}>
                  This icon will visually represent your Assistant
                </CustomTooltip>
              </div>

              <TextFormField
                name="name"
                tooltip="Used to identify the Assistant in the UI."
                label="Name"
                placeholder="e.g. 'Email Assistant'"
              />

              <TextFormField
                tooltip="Used for identifying assistants and their use cases."
                name="description"
                label="Description"
                placeholder="e.g. 'Use this Assistant to help draft professional emails'"
              />

              <TextFormField
                tooltip="Gives your assistant a prime directive"
                name="system_prompt"
                label="Instructions"
                isTextArea={true}
                placeholder="e.g. 'You are a professional email writing assistant that always uses a polite enthusiastic tone, emphasizes action items, and leaves blanks for the human to fill in when you have unknowns'"
                onChange={(e) => {
                  setFieldValue("system_prompt", e.target.value);
                  triggerFinalPromptUpdate(
                    e.target.value,
                    values.task_prompt,
                    searchToolEnabled()
                  );
                }}
                defaultHeight="h-40"
                error={finalPromptError}
              />

              <div>
                <div className="flex items-center gap-x-2 pt-6">
                  <div className="block text-base font-medium">
                    Default AI Model{" "}
                  </div>
                  <CustomTooltip trigger={<FiInfo size={12} />}>
                    Select a Large Language Model (Generative AI model) to power
                    this Assistant
                  </CustomTooltip>
                </div>
                <p className="my-1 text-sm text-subtle">
                  Your assistant will use the user&apos;s set default unless
                  otherwise specified below.
                  {admin &&
                    user?.preferences.default_model &&
                    `  Your current (user-specific) default model is ${getDisplayNameForModel(destructureValue(user?.preferences?.default_model!).modelName)}`}
                </p>
                {admin ? (
                  <div className="flex mb-2 items-starts">
                    <div className="w-96">
                      <SelectorFormField
                        defaultValue={`User default`}
                        name="llm_model_provider_override"
                        options={llmProviders.map((llmProvider) => ({
                          name: llmProvider.name,
                          value: llmProvider.name,
                          icon: llmProvider.icon,
                        }))}
                        includeDefault={true}
                        onSelect={(selected) => {
                          if (selected !== values.llm_model_provider_override) {
                            setFieldValue("llm_model_version_override", null);
                          }
                          setFieldValue(
                            "llm_model_provider_override",
                            selected
                          );
                        }}
                      />
                    </div>

                    {values.llm_model_provider_override && (
                      <div className="ml-4 w-96">
                        <SelectorFormField
                          name="llm_model_version_override"
                          options={
                            modelOptionsByProvider.get(
                              values.llm_model_provider_override
                            ) || []
                          }
                          maxHeight="max-h-72"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-w-sm">
                    <LlmList
                      scrollable
                      userDefault={
                        user?.preferences?.default_model!
                          ? destructureValue(user?.preferences?.default_model!)
                              .modelName
                          : null
                      }
                      llmProviders={llmProviders}
                      currentLlm={values.llm_model_version_override}
                      onSelect={(value: string | null) => {
                        if (value !== null) {
                          const { modelName, provider, name } =
                            destructureValue(value);
                          setFieldValue(
                            "llm_model_version_override",
                            modelName
                          );
                          setFieldValue("llm_model_provider_override", name);
                        } else {
                          setFieldValue("llm_model_version_override", null);
                          setFieldValue("llm_model_provider_override", null);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-x-2 pt-6">
                  <div className="block text-base font-medium">
                    Capabilities{" "}
                  </div>
                  <CustomTooltip trigger={<FiInfo size={12} />}>
                    You can give your assistant advanced capabilities like image
                    generation
                  </CustomTooltip>
                  <div className="block text-sm font-description text-subtle">
                    Advanced
                  </div>
                </div>

                <div className="flex flex-col pt-6 ml-1 gap-y-4">
                  {imageGenerationTool && (
                    <CustomTooltip
                      trigger={
                        <div
                          className={`w-fit ${
                            !currentLLMSupportsImageOutput
                              ? "opacity-70 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <BooleanFormField
                            name={`enabled_tools_map.${imageGenerationTool.id}`}
                            label="Image Generation Tool"
                            onChange={() => {
                              toggleToolInValues(imageGenerationTool.id);
                            }}
                            disabled={!currentLLMSupportsImageOutput}
                          />
                        </div>
                      }
                      asChild
                    >
                      {!currentLLMSupportsImageOutput && (
                        <p>
                          To use Image Generation, select GPT-4o or another
                          image compatible model as the default model for this
                          Assistant.
                        </p>
                      )}
                    </CustomTooltip>
                  )}

                  {searchTool && (
                    <CustomTooltip
                      trigger={
                        <div
                          className={`w-fit ${
                            ccPairs.length === 0
                              ? "opacity-70 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <BooleanFormField
                            name={`enabled_tools_map.${searchTool.id}`}
                            label="Search Tool"
                            onChange={() => {
                              setFieldValue("num_chunks", null);
                              toggleToolInValues(searchTool.id);
                            }}
                            disabled={ccPairs.length === 0}
                          />
                        </div>
                      }
                      asChild
                    >
                      {ccPairs.length === 0 && (
                        <p>
                          To use the Search Tool, you need to have at least one
                          Connector-Credential pair configured.
                        </p>
                      )}
                    </CustomTooltip>
                  )}

                  {ccPairs.length > 0 && searchTool && (
                    <>
                      {searchToolEnabled() && (
                        <CollapsibleSection prompt="Configure Search">
                          <div>
                            {ccPairs.length > 0 && (
                              <>
                                <Label small>Document Sets</Label>
                                <div>
                                  <SubLabel>
                                    <>
                                      Select which{" "}
                                      {!user || user.role === "admin" ? (
                                        <Link
                                          href={
                                            teamspaceId
                                              ? `/t/${teamspaceId}/admin/documents/sets"`
                                              : "/admin/documents/sets"
                                          }
                                          className="text-blue-500"
                                          target="_blank"
                                        >
                                          Document Sets
                                        </Link>
                                      ) : (
                                        "Document Sets"
                                      )}{" "}
                                      this Assistant should search through. If
                                      none are specified, the Assistant will
                                      search through all available documents in
                                      order to try and respond to queries.
                                    </>
                                  </SubLabel>
                                </div>

                                {documentSets.length > 0 ? (
                                  <FieldArray
                                    name="document_set_ids"
                                    render={(arrayHelpers: ArrayHelpers) => (
                                      <div>
                                        <div className="flex flex-wrap gap-2 mt-2 mb-3 text-sm">
                                          {documentSets.map((documentSet) => {
                                            const ind =
                                              values.document_set_ids.indexOf(
                                                documentSet.id
                                              );
                                            let isSelected = ind !== -1;
                                            return (
                                              <DocumentSetSelectable
                                                key={documentSet.id}
                                                documentSet={documentSet}
                                                isSelected={isSelected}
                                                onSelect={() => {
                                                  if (isSelected) {
                                                    arrayHelpers.remove(ind);
                                                  } else {
                                                    arrayHelpers.push(
                                                      documentSet.id
                                                    );
                                                  }
                                                }}
                                              />
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  />
                                ) : (
                                  <i className="text-sm">
                                    No Document Sets available.{" "}
                                    {user?.role !== "admin" && (
                                      <>
                                        If this functionality would be useful,
                                        reach out to the administrators of
                                        enMedD AI for assistance.
                                      </>
                                    )}
                                  </i>
                                )}

                                <div className="flex flex-col mt-4 gap-y-4">
                                  <TextFormField
                                    name="num_chunks"
                                    label="Number of Context Documents"
                                    tooltip="How many of the top matching document sections to feed the LLM for context when generating a response"
                                    placeholder="Defaults to 10"
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (
                                        value === "" ||
                                        /^[0-9]+$/.test(value)
                                      ) {
                                        setFieldValue("num_chunks", value);
                                      }
                                    }}
                                  />

                                  <TextFormField
                                    width="max-w-xl"
                                    type="date"
                                    subtext="Documents prior to this date will not be referenced by the search tool"
                                    optional
                                    label="Search Start Date"
                                    value={values.search_start_date}
                                    name="search_start_date"
                                  />

                                  <BooleanFormField
                                    alignTop
                                    name="llm_relevance_filter"
                                    label="Apply LLM Relevance Filter"
                                    subtext={
                                      "If enabled, the LLM will filter out chunks that are not relevant to the user query."
                                    }
                                  />

                                  <BooleanFormField
                                    alignTop
                                    name="include_citations"
                                    label="Include Citations"
                                    subtext={`
                                      If set, the response will include bracket citations ([1], [2], etc.)
                                      for each document used by the LLM to help inform the response. This is
                                      the same technique used by the default Assistants. In general, we recommend
                                      to leave this enabled in order to increase trust in the LLM answer.`}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </CollapsibleSection>
                      )}
                    </>
                  )}

                  {internetSearchTool && (
                    <BooleanFormField
                      name={`enabled_tools_map.${internetSearchTool.id}`}
                      label={internetSearchTool.display_name}
                      onChange={() => {
                        toggleToolInValues(internetSearchTool.id);
                      }}
                    />
                  )}

                  {customTools.length > 0 && (
                    <>
                      {customTools.map((tool) => (
                        <BooleanFormField
                          alignTop={tool.description != null}
                          key={tool.id}
                          name={`enabled_tools_map.${tool.id}`}
                          label={tool.name}
                          subtext={tool.description}
                          onChange={() => {
                            toggleToolInValues(tool.id);
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
              <Divider />
              <AdvancedOptionsToggle
                showAdvancedOptions={showAdvancedOptions}
                setShowAdvancedOptions={setShowAdvancedOptions}
              />

              {showAdvancedOptions && (
                <>
                  {llmProviders.length > 0 && (
                    <>
                      <TextFormField
                        name="task_prompt"
                        label="Reminders (Optional)"
                        isTextArea={true}
                        placeholder="e.g. 'Remember to reference all of the points mentioned in my message to you and focus on identifying action items that can move things forward'"
                        onChange={(e) => {
                          setFieldValue("task_prompt", e.target.value);
                          triggerFinalPromptUpdate(
                            values.system_prompt,
                            e.target.value,
                            searchToolEnabled()
                          );
                        }}
                        defaultHeight="h-40"
                        explanationText="Learn about prompting in our docs!"
                        explanationLink="https://docs.danswer.dev/guides/assistants"
                        optional
                      />
                    </>
                  )}

                  <div className="flex flex-col mb-6">
                    <div className="flex items-center gap-x-2">
                      <div className="block text-base font-medium">
                        Starter Messages (Optional)
                      </div>
                    </div>
                    <FieldArray
                      name="starter_messages"
                      render={(
                        arrayHelpers: ArrayHelpers<StarterMessage[]>
                      ) => (
                        <div>
                          {values.starter_messages &&
                            values.starter_messages.length > 0 &&
                            values.starter_messages.map(
                              (
                                starterMessage: StarterMessage,
                                index: number
                              ) => {
                                return (
                                  <div
                                    key={index}
                                    className={index === 0 ? "mt-2" : "mt-6"}
                                  >
                                    <div className="flex">
                                      <Card className="mr-4">
                                        <CardContent>
                                          <div>
                                            <Label small>Name</Label>
                                            <SubLabel>
                                              Shows up as the &quot;title&quot;
                                              for this Starter Message. For
                                              example, &quot;Write an
                                              email&quot;.
                                            </SubLabel>
                                            <Input
                                              name={`starter_messages[${index}].name`}
                                              autoComplete="off"
                                              value={
                                                values.starter_messages[index]
                                                  .name
                                              }
                                              onChange={(e) =>
                                                setFieldValue(
                                                  `starter_messages[${index}].name`,
                                                  e.target.value
                                                )
                                              }
                                            />
                                            <ErrorMessage
                                              name={`starter_messages[${index}].name`}
                                              component="div"
                                              className="mt-1 text-sm text-error"
                                            />
                                          </div>

                                          <div className="mt-3">
                                            <Label small>Description</Label>
                                            <SubLabel>
                                              A description which tells the user
                                              what they might want to use this
                                              Starter Message for. For example
                                              &quot;to a client about a new
                                              feature&quot;
                                            </SubLabel>
                                            <Input
                                              name={`starter_messages.${index}.description`}
                                              autoComplete="off"
                                              value={
                                                values.starter_messages[index]
                                                  .description
                                              }
                                              onChange={(e) =>
                                                setFieldValue(
                                                  `starter_messages[${index}].description`,
                                                  e.target.value
                                                )
                                              }
                                            />
                                            <ErrorMessage
                                              name={`starter_messages[${index}].description`}
                                              component="div"
                                              className="mt-1 text-sm text-error"
                                            />
                                          </div>

                                          <div className="mt-3">
                                            <Label small>Message</Label>
                                            <SubLabel>
                                              The actual message to be sent as
                                              the initial user message if a user
                                              selects this starter prompt. For
                                              example, &quot;Write me an email
                                              to a client about a new billing
                                              feature we just released.&quot;
                                            </SubLabel>
                                            <Textarea
                                              name={`starter_messages[${index}].message`}
                                              autoComplete="off"
                                              className="min-h-40"
                                              value={
                                                values.starter_messages[index]
                                                  .message
                                              }
                                              onChange={(e) =>
                                                setFieldValue(
                                                  `starter_messages[${index}].message`,
                                                  e.target.value
                                                )
                                              }
                                            />
                                            <ErrorMessage
                                              name={`starter_messages[${index}].message`}
                                              component="div"
                                              className="mt-1 text-sm text-error"
                                            />
                                          </div>
                                        </CardContent>
                                      </Card>
                                      <div className="my-auto">
                                        <CustomTooltip
                                          trigger={
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              type="button"
                                            >
                                              <FiX
                                                onClick={() =>
                                                  arrayHelpers.remove(index)
                                                }
                                              />
                                            </Button>
                                          }
                                          variant="destructive"
                                        >
                                          Remove
                                        </CustomTooltip>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}

                          <Button
                            onClick={() => {
                              arrayHelpers.push({
                                name: "",
                                description: "",
                                message: "",
                              });
                            }}
                            className="mt-3"
                            type="button"
                          >
                            <Plus size={16} /> Add New
                          </Button>
                        </div>
                      )}
                    />
                  </div>

                  {!teamspaceId && (
                    <IsPublicGroupSelector
                      formikProps={{
                        values,
                        isSubmitting,
                        setFieldValue,
                        ...formikProps,
                      }}
                      objectName="assistant"
                      enforceGroupSelection={false}
                    />
                  )}
                </>
              )}

              <div className="flex pt-6">
                <Button
                  className="mx-auto"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isUpdate ? "Update" : "Create"}
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
