import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import { BookstackIcon } from "@/components/icons/icons";
import { AddPromptModalProps } from "../interfaces";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Button } from "@/components/ui/button";

const AddPromptSchema = Yup.object().shape({
  title: Yup.string().required("Title is required"),
  prompt: Yup.string().required("Prompt is required"),
});

const AddPromptModal = ({ onClose, onSubmit }: AddPromptModalProps) => {
  return (
    <div>
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
            <TextFormField
              label="Title"
              name="title"
              placeholder="Title (e.g. 'Reword')"
            />

            <TextFormField
              isTextArea
              label="Prompt"
              name="prompt"
              placeholder="Enter a prompt (e.g. 'help me rewrite the following politely and concisely for professional communication')"
              maxHeight={500}
              defaultHeight="h-40"
            />

            <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
              Add prompt
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default AddPromptModal;
