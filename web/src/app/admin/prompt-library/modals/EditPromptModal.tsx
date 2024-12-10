import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Modal } from "@/components/Modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useInputPrompt } from "../hooks";
import { EditPromptModalProps } from "../interfaces";
import { EditIcon } from "@/components/icons/icons";

const EditPromptSchema = Yup.object().shape({
  prompt: Yup.string().required("Title is required"),
  content: Yup.string().required("Content is required"),
  active: Yup.boolean(),
});

const EditPromptModal = ({
  onClose,
  promptId,
  editInputPrompt,
}: EditPromptModalProps) => {
  const {
    data: promptData,
    error,
    refreshInputPrompt,
  } = useInputPrompt(promptId);

  if (error)
    return (
      <Modal onOutsideClick={onClose} width="max-w-xl">
        <p>Failed to load prompt data</p>
      </Modal>
    );

  if (!promptData)
    return (
      <Modal onOutsideClick={onClose} width="w-full max-w-xl">
        <p>Loading...</p>
      </Modal>
    );

  return (
    <Modal onOutsideClick={onClose} width="w-full max-w-xl">
      <Formik
        initialValues={{
          prompt: promptData.prompt,
          content: promptData.content,
          active: promptData.active,
        }}
        validationSchema={EditPromptSchema}
        onSubmit={(values) => {
          editInputPrompt(promptId, values);
          refreshInputPrompt();
        }}
      >
        {({ isSubmitting, values }) => (
          <Form className="items-stretch">
            <h2 className="text-2xl text-emphasis font-bold mb-3 flex items-center">
              <EditIcon size={20} className="mr-2" />
              Edit prompt
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="prompt"
                  className="block text-sm font-medium mb-1"
                >
                  Title
                </label>
                <Field
                  as={Textarea}
                  id="prompt"
                  name="prompt"
                  placeholder="Title (e.g. 'Draft email')"
                />
                <ErrorMessage
                  name="prompt"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium mb-1"
                >
                  Content
                </label>
                <Field
                  as={Textarea}
                  id="content"
                  name="content"
                  placeholder="Enter prompt content (e.g. 'Write a professional-sounding email about the following content')"
                  rows={4}
                />
                <ErrorMessage
                  name="content"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <Field type="checkbox" name="active" className="mr-2" />
                  Active prompt
                </label>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (values.prompt === promptData.prompt &&
                    values.content === promptData.content &&
                    values.active === promptData.active)
                }
              >
                {isSubmitting ? "Updating..." : "Update prompt"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};

export default EditPromptModal;
