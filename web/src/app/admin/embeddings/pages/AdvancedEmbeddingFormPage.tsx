import React, { Dispatch, forwardRef, SetStateAction } from "react";
import { Formik, Form, FormikProps, FieldArray, Field } from "formik";
import * as Yup from "yup";
import CredentialSubText from "@/components/credentials/CredentialFields";
import { TrashIcon } from "@/components/icons/icons";
import { FaPlus } from "react-icons/fa";
import { AdvancedSearchConfiguration } from "../interfaces";
import { BooleanFormField } from "@/components/admin/connectors/Field";
import NumberInput from "../../connectors/[connector]/pages/ConnectorInput/NumberInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomTooltip } from "@/components/CustomTooltip";

interface AdvancedEmbeddingFormPageProps {
  updateAdvancedEmbeddingDetails: (
    key: keyof AdvancedSearchConfiguration,
    value: any
  ) => void;
  advancedEmbeddingDetails: AdvancedSearchConfiguration;
}

const AdvancedEmbeddingFormPage = forwardRef<
  FormikProps<any>,
  AdvancedEmbeddingFormPageProps
>(({ updateAdvancedEmbeddingDetails, advancedEmbeddingDetails }, ref) => {
  return (
    <div className="py-4 rounded-lg max-w-4xl px-4 mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-text-800">
        Advanced Configuration
      </h2>
      <Formik
        innerRef={ref}
        initialValues={advancedEmbeddingDetails}
        validationSchema={Yup.object().shape({
          multilingual_expansion: Yup.array().of(Yup.string()),
          multipass_indexing: Yup.boolean(),
          disable_rerank_for_streaming: Yup.boolean(),
          num_rerank: Yup.number(),
        })}
        onSubmit={async (_, { setSubmitting }) => {
          setSubmitting(false);
        }}
        validate={(values) => {
          // Call updateAdvancedEmbeddingDetails for each changed field
          Object.entries(values).forEach(([key, value]) => {
            updateAdvancedEmbeddingDetails(
              key as keyof AdvancedSearchConfiguration,
              value
            );
          });
        }}
        enableReinitialize={true}
      >
        {({ values }) => (
          <Form>
            <FieldArray name="multilingual_expansion">
              {({ push, remove }) => (
                <div className="w-full">
                  {values.multilingual_expansion.map(
                    (_: any, index: number) => (
                      <div key={index} className="w-full flex mb-4 gap-2">
                        <Input name={`multilingual_expansion.${index}`} />
                        <CustomTooltip
                          trigger={
                            <Button
                              variant="ghost"
                              onClick={() => remove(index)}
                              size="icon"
                            >
                              <TrashIcon className="text-white my-auto" />
                            </Button>
                          }
                          variant="destructive"
                        >
                          Delete
                        </CustomTooltip>
                      </div>
                    )
                  )}
                  <Button onClick={() => push("")} className="mb-4">
                    <FaPlus className="mr-2" />
                    Add Language
                  </Button>
                </div>
              )}
            </FieldArray>

            <BooleanFormField
              subtext="Enable multipass indexing for both mini and large chunks."
              label="Multipass Indexing"
              name="multipass_indexing"
              alignTop
            />
            <BooleanFormField
              subtext="Disable reranking for streaming to improve response time."
              label="Disable Rerank for Streaming"
              name="disable_rerank_for_streaming"
              alignTop
            />
            <NumberInput
              description="Number of results to rerank"
              optional={false}
              label="Number of Results to Rerank"
              name="num_rerank"
            />
          </Form>
        )}
      </Formik>
    </div>
  );
});
export default AdvancedEmbeddingFormPage;

AdvancedEmbeddingFormPage.displayName = "AdvancedEmbeddingFormPage";
