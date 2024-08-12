import React, { Dispatch, forwardRef, SetStateAction } from "react";
import { Formik, Form, FormikProps } from "formik";
import * as Yup from "yup";
import { EditingValue } from "@/components/credentials/EditingValue";
import { RerankerProvider, RerankingDetails } from "./types";

interface RerankingDetailsFormProps {
  setRerankingDetails: Dispatch<SetStateAction<RerankingDetails>>;
  currentRerankingDetails: RerankingDetails;
}

const RerankingDetailsForm = forwardRef<
  FormikProps<RerankingDetails>,
  RerankingDetailsFormProps
>(({ setRerankingDetails, currentRerankingDetails }, ref) => {
  return (
    <div className="py-4 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-text-800">
        Reranking Configuration
      </h2>

      <Formik
        innerRef={ref}
        initialValues={currentRerankingDetails}
        validationSchema={Yup.object().shape({
          rerank_model_name: Yup.string().nullable(),
          provider_type: Yup.mixed<RerankerProvider>()
            .nullable()
            .oneOf(Object.values(RerankerProvider)),
          api_key: Yup.string().nullable(),
          num_rerank: Yup.number().min(1, "Must be at least 1"),
        })}
        onSubmit={async (_, { setSubmitting }) => {
          setSubmitting(false);
        }}
        enableReinitialize={true}
      >
        {({ values, setFieldValue }) => (
          <Form className="space-y-6">
            <div key="rerank_model_name">
              <EditingValue
                description="The name of the reranking model to use"
                optional
                currentValue={values.rerank_model_name}
                onChange={(value: string | null) => {
                  setRerankingDetails({ ...values, rerank_model_name: value });
                  setFieldValue("rerank_model_name", value);
                }}
                setFieldValue={setFieldValue}
                type="text"
                label="Rerank Model Name"
                name="rerank_model_name"
              />
            </div>

            <div key="provider_type">
              <EditingValue
                description="The provider type for reranking"
                optional
                currentValue={values.provider_type}
                onChange={(value: string | null) => {
                  setRerankingDetails({
                    ...values,
                    provider_type: value as RerankerProvider,
                  });
                  setFieldValue("provider_type", value);
                }}
                setFieldValue={setFieldValue}
                type="select"
                options={Object.values(RerankerProvider).map((provider) => ({
                  value: provider,
                  label: provider,
                }))}
                label="Provider Type"
                name=""
              />
            </div>
            {values.provider_type === "cohere" && (
              <div key="api_key">
                <EditingValue
                  description="API key for the reranking service"
                  optional
                  currentValue={values.api_key}
                  onChange={(value: string | null) => {
                    setRerankingDetails({ ...values, api_key: value });
                    setFieldValue("api_key", value);
                  }}
                  setFieldValue={setFieldValue}
                  type="password"
                  label="API Key"
                  name="api_key"
                />
              </div>
            )}
            <div key="num_rerank">
              <EditingValue
                description="Number of results to rerank"
                optional={false}
                currentValue={values.num_rerank}
                onChangeNumber={(value: number) => {
                  setRerankingDetails({ ...values, num_rerank: value });
                  setFieldValue("num_rerank", value);
                }}
                setFieldValue={setFieldValue}
                type="number"
                label="Number of Results to Rerank"
                name="num_rerank"
              />
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
});

RerankingDetailsForm.displayName = "RerankingDetailsForm";
export default RerankingDetailsForm;
