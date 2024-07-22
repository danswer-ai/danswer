import React from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { EditingValue } from "@/components/credentials/EditingValue";
import { advancedConfig } from "../AddConnectorPage";

const AdvancedFormPage = ({
  onSubmit,
  onClose,
  setAdvancedConfig,
}: {
  onSubmit: () => void;
  onClose: () => void;
  setAdvancedConfig: React.Dispatch<
    React.SetStateAction<advancedConfig | null>
  >;
}) => {
  return (
    <div className="py-4 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-neutral-800">
        Advanced Configuration
      </h2>
      <Formik
        initialValues={{
          pruneFreq: 0,
          refreshFreq: 0,
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().required("Must provide a name for the Assistant"),
        })}
        onSubmit={async (_, { setSubmitting }) => {}}
      >
        {({ setFieldValue, values }) => (
          <Form className="space-y-6">
            <div key="prune_freq">
              <EditingValue
                description="How often to prune your documents (in minutes)"
                optional
                setFieldValue={setFieldValue}
                type="number"
                label="Prune Frequency"
                name="prune_freq"
              />
            </div>
            <div key="refresh_freq">
              <EditingValue
                description="How often to refresh your documents (in minutes)"
                optional
                setFieldValue={setFieldValue}
                type="number"
                label="Refresh Frequency"
                name="refresh_freq"
              />
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default AdvancedFormPage;
