"use client";

import { usePopup } from "@/components/admin/connectors/Popup";
import { StandardAnswer } from "@/lib/types";
import { Button, Card } from "@tremor/react";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import {
  createStandardAnswer,
  StandardAnswerCreationRequest,
  updateStandardAnswer,
} from "./lib";
import {
  TextFormField,
  MarkdownFormField,
  BooleanFormField,
  SelectorFormField,
  Label,
  SubLabel,
} from "@/components/admin/connectors/Field";
import { SearchMultiSelectDropdown } from "@/components/Dropdown";
import { Persona } from "@/app/admin/assistants/interfaces";
import { PersonaSearchMultiSelectDropdownField } from "@/components/persona/PersonaDropdown";
import { useState } from "react";

function mapKeywordSelectToMatchAny(keywordSelect: "any" | "all"): boolean {
  return keywordSelect == "any";
}

function mapMatchAnyToKeywordSelect(matchAny: boolean): "any" | "all" {
  return matchAny ? "any" : "all";
}

export const StandardAnswerCreationForm = ({
  existingStandardAnswer,
  existingPersonas,
}: {
  existingStandardAnswer?: StandardAnswer;
  existingPersonas: Persona[];
}) => {
  const isUpdate = existingStandardAnswer !== undefined;
  const { popup, setPopup } = usePopup();
  const router = useRouter();

  return (
    <div>
      <Card>
        {popup}
        <Formik
          initialValues={{
            keyword: existingStandardAnswer
              ? existingStandardAnswer.keyword
              : "",
            answer: existingStandardAnswer ? existingStandardAnswer.answer : "",
            matchRegex: existingStandardAnswer
              ? existingStandardAnswer.match_regex
              : false,
            matchAnyKeywords: existingStandardAnswer
              ? mapMatchAnyToKeywordSelect(
                  existingStandardAnswer.match_any_keywords
                )
              : "all",
            applyGlobally: existingStandardAnswer
              ? existingStandardAnswer.apply_globally
              : false,
            personas: existingStandardAnswer
              ? existingStandardAnswer.personas
              : [],
          }}
          validationSchema={Yup.object().shape({
            keyword: Yup.string()
              .required("Keywords or pattern is required")
              .max(255)
              .min(1),
            answer: Yup.string().required("Answer is required").min(1),
          })}
          onSubmit={async (values, formikHelpers) => {
            formikHelpers.setSubmitting(true);

            const cleanedValues: StandardAnswerCreationRequest = {
              ...values,
              matchAnyKeywords: mapKeywordSelectToMatchAny(
                values.matchAnyKeywords
              ),
              personas: values.personas.map((persona) => persona.id),
            };

            let response;
            if (isUpdate) {
              response = await updateStandardAnswer(
                existingStandardAnswer.id,
                cleanedValues
              );
            } else {
              response = await createStandardAnswer(cleanedValues);
            }
            formikHelpers.setSubmitting(false);
            if (response.ok) {
              router.push(`/admin/standard-answer?u=${Date.now()}`);
            } else {
              const responseJson = await response.json();
              const errorMsg = responseJson.detail || responseJson.message;
              setPopup({
                message: isUpdate
                  ? `Error updating Standard Answer - ${errorMsg}`
                  : `Error creating Standard Answer - ${errorMsg}`,
                type: "error",
              });
            }
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form>
              {values.matchRegex ? (
                <TextFormField
                  name="keyword"
                  label="Regex pattern"
                  isCode
                  tooltip="Triggers if the question matches this regex pattern (using Python `re.search()`)"
                  placeholder="(?:it|support)\s*ticket"
                />
              ) : values.matchAnyKeywords == "any" ? (
                <TextFormField
                  name="keyword"
                  label="Any of these keywords, separated by spaces"
                  tooltip="A question must match these keywords in order to trigger the answer."
                  placeholder="ticket problem issue"
                  autoCompleteDisabled={true}
                />
              ) : (
                <TextFormField
                  name="keyword"
                  label="All of these keywords, in any order, separated by spaces"
                  tooltip="A question must match these keywords in order to trigger the answer."
                  placeholder="it ticket"
                  autoCompleteDisabled={true}
                />
              )}
              <BooleanFormField
                subtext="Match a regex pattern instead of an exact keyword"
                optional
                label="Match regex"
                name="matchRegex"
              />
              {values.matchRegex ? null : (
                <SelectorFormField
                  defaultValue={`all`}
                  label="Keyword detection strategy"
                  subtext="Choose whether to require the user's question to contain any or all of the keywords above to show this answer."
                  name="matchAnyKeywords"
                  options={[
                    {
                      name: "All keywords",
                      value: "all",
                    },
                    {
                      name: "Any keywords",
                      value: "any",
                    },
                  ]}
                  onSelect={(selected) => {
                    setFieldValue("matchAnyKeywords", selected);
                  }}
                />
              )}
              {values.matchRegex ? (
                <BooleanFormField
                  subtext="Attempt to match the above regex pattern against every user question Danswer receives from users in your instance"
                  optional
                  label="Watch every question"
                  name="applyGlobally"
                />
              ) : (
                <BooleanFormField
                  subtext="Attempt to match the above keywords against every question Danswer receives from users in your instance "
                  optional
                  label="Watch every message"
                  name="applyGlobally"
                />
              )}
              {values.applyGlobally ? null : (
                <PersonaSearchMultiSelectDropdownField
                  name="personas"
                  label="Watch for messages to these Assistants"
                  subtext=" Select the Assistants you want this Standard Answer to apply to"
                  existingPersonas={existingPersonas}
                  selectedPersonas={values.personas}
                />
              )}
              <div className="w-full">
                <MarkdownFormField
                  name="answer"
                  label="Answer"
                  placeholder="The answer in Markdown. Example: If you need any help from the IT team, please email internalsupport@company.com"
                />
              </div>
              <div className="p-4 flex">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mx-auto w-64"
                >
                  {isUpdate ? "Update!" : "Create!"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </Card>
    </div>
  );
};
