import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { TextFormField } from "../admin/connectors/Field";

const EditPropertyModal = ({
  propertyTitle, // A friendly title to be displayed for the property
  propertyDetails, // a helpful description of the property to be displayed, (Valid ranges, units, etc)
  propertyName, // the programmatic property name
  propertyValue, // the programmatic property value (current)
  validationSchema, // Allow custom Yup schemas ... set on "propertyValue"
  onClose,
  onSubmit,
}: {
  propertyTitle: string;
  propertyDetails?: string;
  propertyName: string;
  propertyValue: string;
  validationSchema: any;
  onClose: () => void;
  onSubmit: (propertyName: string, propertyValue: string) => Promise<void>;
}) => {
  return (
    <Modal onOutsideClick={onClose} width="w-full max-w-xl">
      <Formik
        initialValues={{
          propertyName: propertyName,
          propertyValue: propertyValue,
        }}
        validationSchema={validationSchema}
        onSubmit={(values) => {
          onSubmit(values.propertyName, values.propertyValue);
          onClose();
        }}
      >
        {({ isSubmitting, isValid, values }) => (
          <Form className="items-stretch">
            <h2 className="text-2xl text-emphasis font-bold mb-3 flex items-center">
              <svg
                className="w-6 h-6 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              Edit {propertyTitle}
            </h2>

            <div className="space-y-4">
              <div>
                <TextFormField
                  label={propertyDetails || ""}
                  name="propertyValue"
                  placeholder="Property value"
                />
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !isValid ||
                  values.propertyValue === propertyValue
                }
              >
                {isSubmitting ? "Updating..." : "Update property"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};

export default EditPropertyModal;
