import React from "react";
import { Formik, Form, Field, ErrorMessage, FieldProps } from "formik";
import * as Yup from "yup";
import { useInputPrompt } from "../hooks";
import { EditPromptModalProps } from "../interfaces";
import { CustomModal } from "@/components/CustomModal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil } from "lucide-react";

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

  const renderModalContent = () => {
    if (error) {
      return <p>Failed to load prompt data</p>;
    }

    if (!promptData) {
      return <p>Loading...</p>;
    }

    return (
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
        {({ isSubmitting, setFieldValue, values }) => (
          <Form>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="prompt"
                  className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Title
                </label>
                <Input
                  id="prompt"
                  name="prompt"
                  placeholder="Title (e.g. 'Draft email')"
                  value={values.prompt}
                  onChange={(e) => setFieldValue("prompt", e.target.value)}
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
                  className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Content
                </label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Enter prompt content (e.g. 'Write a professional-sounding email about the following content')"
                  rows={4}
                  value={values.content}
                  onChange={(e) => setFieldValue("content", e.target.value)}
                />
                <ErrorMessage
                  name="content"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Field name="active">
                    {({ field }: FieldProps) => (
                      <Checkbox {...field} checked={field.value} />
                    )}
                  </Field>
                  <label className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Active prompt
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="submit"
                className="w-full"
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
    );
  };

  return (
    <CustomModal
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Pencil />
          Edit prompt
        </div>
      }
      trigger={null}
      open={!!promptId}
    >
      {renderModalContent()}
    </CustomModal>
  );
};

export default EditPromptModal;
