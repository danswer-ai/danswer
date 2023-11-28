"use client";

import { DocumentSet } from "@/lib/types";
import { Button, Divider } from "@tremor/react";
import {
  ArrayHelpers,
  ErrorMessage,
  Field,
  FieldArray,
  Form,
  Formik,
} from "formik";

import * as Yup from "yup";
import { buildFinalPrompt, createPersona, updatePersona } from "./lib";
import { useRouter } from "next/navigation";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Persona } from "./interfaces";
import Link from "next/link";
import { useEffect, useState } from "react";

function SectionHeader({ children }: { children: string | JSX.Element }) {
  return <div className="mb-4 font-bold text-lg">{children}</div>;
}

function Label({ children }: { children: string | JSX.Element }) {
  return (
    <div className="block font-medium text-base text-gray-200">{children}</div>
  );
}

function SubLabel({ children }: { children: string | JSX.Element }) {
  return <div className="text-sm text-gray-300 mb-2">{children}</div>;
}

// TODO: make this the default text input across all forms
function PersonaTextInput({
  name,
  label,
  subtext,
  placeholder,
  onChange,
  type = "text",
  isTextArea = false,
  disabled = false,
  autoCompleteDisabled = true,
}: {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  isTextArea?: boolean;
  disabled?: boolean;
  autoCompleteDisabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {subtext && <SubLabel>{subtext}</SubLabel>}
      <Field
        as={isTextArea ? "textarea" : "input"}
        type={type}
        name={name}
        id={name}
        className={
          `
        border 
        text-gray-200 
        border-gray-600 
        rounded 
        w-full 
        py-2 
        px-3 
        mt-1
        ${isTextArea ? " h-28" : ""}
      ` + (disabled ? " bg-gray-900" : " bg-gray-800")
        }
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoCompleteDisabled ? "off" : undefined}
        {...(onChange ? { onChange } : {})}
      />
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
}

function PersonaBooleanInput({
  name,
  label,
  subtext,
}: {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
}) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {subtext && <SubLabel>{subtext}</SubLabel>}
      <Field
        type="checkbox"
        name={name}
        id={name}
        className={`
        ml-2
        border 
        text-gray-200 
        border-gray-600 
        rounded 
        py-2 
        px-3 
        mt-1
      `}
      />
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
}

export function PersonaEditor({
  existingPersona,
  documentSets,
}: {
  existingPersona?: Persona | null;
  documentSets: DocumentSet[];
}) {
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  const [finalPrompt, setFinalPrompt] = useState<string | null>("");

  const triggerFinalPromptUpdate = async (
    systemPrompt: string,
    taskPrompt: string
  ) => {
    const response = await buildFinalPrompt(systemPrompt, taskPrompt);
    if (response.ok) {
      setFinalPrompt((await response.json()).final_prompt_template);
    }
  };

  const isUpdate = existingPersona !== undefined && existingPersona !== null;

  useEffect(() => {
    if (isUpdate) {
      triggerFinalPromptUpdate(
        existingPersona.system_prompt,
        existingPersona.task_prompt
      );
    }
  }, []);

  return (
    <div className="dark">
      {popup}
      <Formik
        initialValues={{
          name: existingPersona?.name ?? "",
          description: existingPersona?.description ?? "",
          system_prompt: existingPersona?.system_prompt ?? "",
          task_prompt: existingPersona?.task_prompt ?? "",
          document_set_ids:
            existingPersona?.document_sets?.map(
              (documentSet) => documentSet.id
            ) ?? ([] as number[]),
          num_chunks: existingPersona?.num_chunks ?? null,
          apply_llm_relevance_filter:
            existingPersona?.apply_llm_relevance_filter ?? false,
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().required("Must give the Persona a name!"),
          description: Yup.string().required(
            "Must give the Persona a description!"
          ),
          system_prompt: Yup.string().required(
            "Must give the Persona a system prompt!"
          ),
          task_prompt: Yup.string().required(
            "Must give the Persona a task prompt!"
          ),
          document_set_ids: Yup.array().of(Yup.number()),
          num_chunks: Yup.number().max(20).nullable(),
          apply_llm_relevance_filter: Yup.boolean().required(),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);

          let response;
          if (isUpdate) {
            response = await updatePersona({
              id: existingPersona.id,
              ...values,
              num_chunks: values.num_chunks || null,
            });
          } else {
            response = await createPersona({
              ...values,
              num_chunks: values.num_chunks || null,
            });
          }
          if (response.ok) {
            router.push(`/admin/personas?u=${Date.now()}`);
            return;
          }

          setPopup({
            type: "error",
            message: `Failed to create Persona - ${await response.text()}`,
          });
          formikHelpers.setSubmitting(false);
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <div className="pb-6">
              <SectionHeader>Who am I?</SectionHeader>

              <PersonaTextInput
                name="name"
                label="Name"
                disabled={isUpdate}
                subtext="Users will be able to select this Persona based on this name."
              />

              <PersonaTextInput
                name="description"
                label="Description"
                subtext="Provide a short descriptions which gives users a hint as to what they should use this Persona for."
              />

              <Divider />

              <SectionHeader>Customize my response style</SectionHeader>

              <PersonaTextInput
                name="system_prompt"
                label="System Prompt"
                isTextArea={true}
                subtext={
                  'Give general info about what the Persona is about. For example, "You are an assistant for On-Call engineers. Your goal is to read the provided context documents and give recommendations as to how to resolve the issue."'
                }
                onChange={(e) => {
                  setFieldValue("system_prompt", e.target.value);
                  triggerFinalPromptUpdate(e.target.value, values.task_prompt);
                }}
              />

              <PersonaTextInput
                name="task_prompt"
                label="Task Prompt"
                isTextArea={true}
                subtext={
                  'Give specific instructions as to what to do with the user query. For example, "Find any relevant sections from the provided documents that can help the user resolve their issue and explain how they are relevant."'
                }
                onChange={(e) => {
                  setFieldValue("task_prompt", e.target.value);
                  triggerFinalPromptUpdate(
                    values.system_prompt,
                    e.target.value
                  );
                }}
              />

              <Label>Final Prompt</Label>

              {finalPrompt ? (
                <pre className="text-sm mt-2 whitespace-pre-wrap">
                  {finalPrompt.replaceAll("\\n", "\n")}
                </pre>
              ) : (
                "-"
              )}

              <Divider />

              <SectionHeader>What data should I have access to?</SectionHeader>

              <FieldArray
                name="document_set_ids"
                render={(arrayHelpers: ArrayHelpers) => (
                  <div>
                    <div>
                      <SubLabel>
                        <>
                          Select which{" "}
                          <Link
                            href="/admin/documents/sets"
                            className="text-blue-500"
                            target="_blank"
                          >
                            Document Sets
                          </Link>{" "}
                          that this Persona should search through. If none are
                          specified, the Persona will search through all
                          available documents in order to try and response to
                          queries.
                        </>
                      </SubLabel>
                    </div>
                    <div className="mb-3 mt-2 flex gap-2 flex-wrap text-sm">
                      {documentSets.map((documentSet) => {
                        const ind = values.document_set_ids.indexOf(
                          documentSet.id
                        );
                        let isSelected = ind !== -1;
                        return (
                          <div
                            key={documentSet.id}
                            className={
                              `
                              px-3 
                              py-1
                              rounded-lg 
                              border
                              border-gray-700 
                              w-fit 
                              flex 
                              cursor-pointer ` +
                              (isSelected
                                ? " bg-gray-600"
                                : " bg-gray-900 hover:bg-gray-700")
                            }
                            onClick={() => {
                              if (isSelected) {
                                arrayHelpers.remove(ind);
                              } else {
                                arrayHelpers.push(documentSet.id);
                              }
                            }}
                          >
                            <div className="my-auto">{documentSet.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              />

              <Divider />

              <SectionHeader>[Advanced] Retrieval Customization</SectionHeader>

              <PersonaTextInput
                name="num_chunks"
                label="Number of Chunks"
                subtext={
                  <div>
                    How many chunks should we feed into the LLM when generating
                    the final response? Each chunk is ~400 words long. If you
                    are using gpt-3.5-turbo or other similar models, setting
                    this to a value greater than 5 will result in errors at
                    query time due to the model&apos;s input length limit.
                    <br />
                    <br />
                    If unspecified, will use 5 chunks.
                  </div>
                }
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only integer values
                  if (value === "" || /^[0-9]+$/.test(value)) {
                    setFieldValue("num_chunks", value);
                  }
                }}
              />

              <PersonaBooleanInput
                name="apply_llm_relevance_filter"
                label="Apply LLM Relevance Filter"
                subtext={
                  "If enabled, the LLM will filter out chunks that are not relevant to the user query."
                }
              />

              <Divider />

              <div className="flex">
                <Button
                  className="mx-auto"
                  variant="secondary"
                  size="md"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isUpdate ? "Update!" : "Create!"}
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
