import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { ModalWrapper } from "@/app/chat/modal/ModalWrapper";
import { Button, Textarea, TextInput } from "@tremor/react";

import { BookstackIcon } from "@/components/icons/icons";
import { AddPromptModalProps } from "../interfaces";

const AddPromptSchema = Yup.object().shape({
  title: Yup.string().required("Title is required"),
  prompt: Yup.string().required("Prompt is required"),
});

const AddPromptModal = ({ onClose, onSubmit }: AddPromptModalProps) => {
  const defaultPrompts = [
    {
      title: "Email help",
      prompt: "Write a professional email addressing the following points:",
    },
    {
      title: "Code explanation",
      prompt: "Explain the following code snippet in simple terms:",
    },
    {
      title: "Product description",
      prompt: "Write a compelling product description for the following item:",
    },
    {
      title: "Troubleshooting steps",
      prompt:
        "Provide step-by-step troubleshooting instructions for the following issue:",
    },
  ];

  return (
    <ModalWrapper onClose={onClose} modalClassName="max-w-xl">
      <Formik
        initialValues={{
          title: "",
          prompt: "",
        }}
        validationSchema={AddPromptSchema}
        onSubmit={(values, { setSubmitting }) => {
          onSubmit({
            prompt: values.title,
            content: values.prompt,
          });
          setSubmitting(false);
          onClose();
        }}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <h2 className="text-2xl gap-x-2 text-emphasis font-bold mb-3 flex items-center">
              <BookstackIcon size={20} />
              Add prompt
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium mb-1"
                >
                  Title
                </label>
                <Field
                  className="placeholder:text-subtle bg-background-50 border-border"
                  as={TextInput}
                  id="title"
                  name="title"
                  placeholder="Title (e.g. 'Reword')"
                />
                <ErrorMessage
                  name="title"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="prompt"
                  className="block text-sm font-medium mb-1"
                >
                  Prompt
                </label>
                <Field
                  as={Textarea}
                  id="prompt"
                  name="prompt"
                  placeholder="Enter a prompt (e.g. 'help me rewrite the following politely and concisely for professional communication')"
                  rows={4}
                />
                <ErrorMessage
                  name="prompt"
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>
            </div>
            <div className="mt-6">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Add prompt
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </ModalWrapper>
  );
};

export default AddPromptModal;
