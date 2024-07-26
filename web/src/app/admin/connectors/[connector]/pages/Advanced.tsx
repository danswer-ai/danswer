import React, { Dispatch, SetStateAction } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { EditingValue } from "@/components/credentials/EditingValue";

const AdvancedFormPage = ({
  setRefreshFreq,
  setPruneFreq,
  currentPruneFreq,
  currentRefreshFreq,
  indexingStart,
  setIndexingStart,
}: {
  currentPruneFreq: number;
  currentRefreshFreq: number;
  setRefreshFreq: Dispatch<SetStateAction<number>>;
  setPruneFreq: Dispatch<SetStateAction<number>>;
  setIndexingStart: Dispatch<SetStateAction<Date | null>>;
  indexingStart: Date | null;
}) => {
  return (
    <div className="py-4 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-text-800">
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
        {({ setFieldValue }) => (
          <Form className="space-y-6">
            <div key="prune_freq">
              <EditingValue
                description="Checking all documents against the source to see if any no longer exist. Documents are deleted based on this. Note: To do this, we must check every document with the source so careful turning up the frequency of this (in minutes)"
                optional
                currentValue={
                  currentPruneFreq == 0 ? undefined : currentPruneFreq
                }
                onChangeNumber={(value: number) => setPruneFreq(value)}
                setFieldValue={setFieldValue}
                type="number"
                label="Prune Frequency"
                name="prune_freq"
              />
            </div>
            <div key="refresh_freq">
              <EditingValue
                description="This is how frequently we pull new documents from the source (in minutes)"
                optional
                currentValue={
                  currentRefreshFreq == 0 ? undefined : currentRefreshFreq
                }
                onChangeNumber={(value: number) => setRefreshFreq(value)}
                setFieldValue={setFieldValue}
                type="number"
                label="Refresh Frequency"
                name="refresh_freq"
              />
            </div>
            <div key="indexing_start">
              <EditingValue
                description="Documents prior to this date will not be pulled in"
                optional
                currentValue={indexingStart ? indexingStart : undefined}
                onChangeDate={(value: Date | null) => setIndexingStart(value)}
                setFieldValue={setFieldValue}
                type="date"
                label="Indexing Start Date"
                name="indexing_start"
              />
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default AdvancedFormPage;
