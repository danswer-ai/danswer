import { ArrayHelpers, FieldArray, Form, Formik } from "formik";
import * as Yup from "yup";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { DocumentSet, SlackBotConfig } from "@/lib/types";
import {
  BooleanFormField,
  TextArrayField,
} from "@/components/admin/connectors/Field";
import { createSlackBotConfig, updateSlackBotConfig } from "./lib";

interface SetCreationPopupProps {
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  documentSets: DocumentSet[];
  existingSlackBotConfig?: SlackBotConfig;
}

export const SlackBotCreationForm = ({
  onClose,
  setPopup,
  documentSets,
  existingSlackBotConfig,
}: SetCreationPopupProps) => {
  const isUpdate = existingSlackBotConfig !== undefined;

  return (
    <div>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 overflow-y-auto overscroll-contain"
        onClick={onClose}
      >
        <div
          className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg relative w-1/2 text-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <Formik
            initialValues={{
              channel_names: existingSlackBotConfig
                ? existingSlackBotConfig.channel_config.channel_names
                : ([] as string[]),
              answer_validity_check_enabled: (
                existingSlackBotConfig?.channel_config?.answer_filters || []
              ).includes("well_answered_postfilter"),
              questionmark_prefilter_enabled: (
                existingSlackBotConfig?.channel_config?.answer_filters || []
              ).includes("questionmark_prefilter"),
              respond_tag_only:
                existingSlackBotConfig?.channel_config?.respond_tag_only ||
                false,
              respond_team_member_list:
                existingSlackBotConfig?.channel_config
                  ?.respond_team_member_list || ([] as string[]),
              document_sets: existingSlackBotConfig
                ? existingSlackBotConfig.document_sets.map(
                    (documentSet) => documentSet.id
                  )
                : ([] as number[]),
            }}
            validationSchema={Yup.object().shape({
              channel_names: Yup.array().of(Yup.string()),
              answer_validity_check_enabled: Yup.boolean().required(),
              questionmark_prefilter_enabled: Yup.boolean().required(),
              respond_tag_only: Yup.boolean().required(),
              respond_team_member_list: Yup.array().of(Yup.string()).required(),
              document_sets: Yup.array().of(Yup.number()),
            })}
            onSubmit={async (values, formikHelpers) => {
              formikHelpers.setSubmitting(true);

              // remove empty channel names
              const cleanedValues = {
                ...values,
                channel_names: values.channel_names.filter(
                  (channelName) => channelName !== ""
                ),
                respond_team_member_list:
                  values.respond_team_member_list.filter(
                    (teamMemberEmail) => teamMemberEmail !== ""
                  ),
              };

              let response;
              if (isUpdate) {
                response = await updateSlackBotConfig(
                  existingSlackBotConfig.id,
                  cleanedValues
                );
              } else {
                response = await createSlackBotConfig(cleanedValues);
              }
              formikHelpers.setSubmitting(false);
              if (response.ok) {
                setPopup({
                  message: isUpdate
                    ? "Successfully updated DanswerBot config!"
                    : "Successfully created DanswerBot config!",
                  type: "success",
                });
                onClose();
              } else {
                const responseJson = await response.json();
                const errorMsg = responseJson.detail || responseJson.message;
                setPopup({
                  message: isUpdate
                    ? `Error updating DanswerBot config - ${errorMsg}`
                    : `Error creating DanswerBot config - ${errorMsg}`,
                  type: "error",
                });
              }
            }}
          >
            {({ isSubmitting, values }) => (
              <Form>
                <h2 className="text-xl font-bold mb-3 border-b border-gray-600 pt-4 pb-3 bg-gray-700 px-6">
                  {isUpdate
                    ? "Update a DanswerBot Config"
                    : "Create a new DanswerBot Config"}
                </h2>
                <div className="px-6 pb-6">
                  <TextArrayField
                    name="channel_names"
                    label="Channel Names:"
                    values={values}
                    subtext={
                      <div>
                        The names of the Slack channels you want this
                        configuration to apply to. For example,
                        &apos;#ask-danswer&apos;.
                        <br />
                        <br />
                        <i>NOTE</i>: you still need to add DanswerBot to the
                        channel(s) in Slack itself. Setting this config will not
                        auto-add the bot to the channel.
                      </div>
                    }
                  />
                  <div className="border-t border-gray-600 py-2" />
                  <BooleanFormField
                    name="answer_validity_check_enabled"
                    label="Hide Non-Answers"
                    subtext="If set, will only answer questions that the model determines it can answer"
                  />
                  <div className="border-t border-gray-600 py-2" />
                  <BooleanFormField
                    name="questionmark_prefilter_enabled"
                    label="Only respond to questions"
                    subtext="If set, will only respond to messages that contain a question mark"
                  />
                  <div className="border-t border-gray-600 py-2" />
                  <BooleanFormField
                    name="respond_tag_only"
                    label="Respond to @DanswerBot Only"
                    subtext="If set, DanswerBot will only respond when directly tagged"
                  />
                  <div className="border-t border-gray-600 py-2" />
                  <TextArrayField
                    name="respond_team_member_list"
                    label="Team Members Emails:"
                    subtext={`If specified, DanswerBot responses will only be 
                  visible to members in this list. This is
                  useful if you want DanswerBot to operate in an
                  "assistant" mode, where it helps the team members find
                  answers, but let's them build on top of DanswerBot's response / throw 
                  out the occasional incorrect answer.`}
                    values={values}
                  />
                  <div className="border-t border-gray-600 py-2" />
                  <FieldArray
                    name="document_sets"
                    render={(arrayHelpers: ArrayHelpers) => (
                      <div>
                        <div>
                          <p className="font-medium">Document Sets:</p>
                          <div className="text-xs">
                            The document sets that DanswerBot should search
                            through. If left blank, DanswerBot will search
                            through all documents.
                          </div>
                        </div>
                        <div className="mb-3 mt-2 flex gap-2 flex-wrap">
                          {documentSets.map((documentSet) => {
                            const ind = values.document_sets.indexOf(
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
                                <div className="my-auto">
                                  {documentSet.name}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  />
                  <div className="border-t border-gray-600 py-2" />
                  <div className="flex">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={
                        "bg-slate-500 hover:bg-slate-700 text-white " +
                        "font-bold py-2 px-4 rounded focus:outline-none " +
                        "focus:shadow-outline w-full max-w-sm mx-auto"
                      }
                    >
                      {isUpdate ? "Update!" : "Create!"}
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};
