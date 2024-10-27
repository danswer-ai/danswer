"use client";

import { Form, Formik } from "formik";
import * as Yup from "yup";
import { createDocumentSet, updateDocumentSet } from "./lib";
import { ConnectorIndexingStatus, DocumentSet, Teamspace } from "@/lib/types";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Divider } from "@/components/Divider";
import { Combobox } from "@/components/Combobox";
import { useParams } from "next/navigation";

interface SetCreationPopupProps {
  ccPairs: ConnectorIndexingStatus<any, any>[];
  teamspaces: Teamspace[] | undefined;
  onClose: () => void;
  existingDocumentSet?: DocumentSet;
}

export const DocumentSetCreationForm = ({
  ccPairs,
  teamspaces,
  onClose,
  existingDocumentSet,
}: SetCreationPopupProps) => {
  const { toast } = useToast();
  const { teamspaceId } = useParams();
  const parsedTeamspaceId = Array.isArray(teamspaceId)
    ? teamspaceId[0]
    : teamspaceId;

  const isUpdate = existingDocumentSet !== undefined;

  const connectorItems = ccPairs.map((ccPair) => ({
    value: ccPair.cc_pair_id.toString(),
    label: ccPair.name || `Connector ${ccPair.cc_pair_id}`,
  }));

  return (
    <div>
      <Formik
        initialValues={{
          name: existingDocumentSet ? existingDocumentSet.name : "",
          description: existingDocumentSet
            ? existingDocumentSet.description
            : "",
          cc_pair_ids: existingDocumentSet
            ? existingDocumentSet.cc_pair_descriptors.map(
                (ccPairDescriptor) => {
                  return ccPairDescriptor.id;
                }
              )
            : ([] as number[]),
          is_public: false,
          users: existingDocumentSet ? existingDocumentSet.users : [],
          groups: existingDocumentSet ? existingDocumentSet.groups : [],
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().required("Please enter a name for the set"),
          description: Yup.string().required(
            "Please enter a description for the set"
          ),
          cc_pair_ids: Yup.array()
            .of(Yup.number().required())
            .required("Please select at least one connector"),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);
          const processedValues = {
            ...values,
            groups: [parseInt(parsedTeamspaceId)],
          };

          let response;
          if (isUpdate) {
            response = await updateDocumentSet({
              id: existingDocumentSet.id,
              ...processedValues,
            });
          } else {
            response = await createDocumentSet(processedValues);
          }
          formikHelpers.setSubmitting(false);
          if (response.ok) {
            toast({
              title: isUpdate
                ? "Document Set Updated"
                : "New Document Set Created",
              description: isUpdate
                ? "Your document set has been updated successfully."
                : "Your new document set has been created successfully.",
              variant: "success",
            });
            onClose();
          } else {
            const errorMsg = await response.text();
            toast({
              title: "Action Failed",
              description: isUpdate
                ? `Failed to update document set: ${errorMsg}`
                : `Failed to create document set: ${errorMsg}`,
              variant: "destructive",
            });
          }
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <TextFormField
              name="name"
              label="Name:"
              placeholder="A name for the document set"
              disabled={isUpdate}
              autoCompleteDisabled={true}
            />
            <TextFormField
              name="description"
              label="Description:"
              placeholder="Describe what the document set represents"
              autoCompleteDisabled={true}
            />

            <div>
              <p className="mb-1 text-sm font-semibold">Pick your connectors:</p>
              <Combobox
                items={connectorItems}
                onSelect={(selectedValues) => {
                  const selectedIds = selectedValues.map((val) =>
                    parseInt(val, 10)
                  );
                  setFieldValue("cc_pair_ids", selectedIds);
                }}
                placeholder="Search connectors"
                label="Select connectors"
              />
            </div>

            <div className="flex mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-64 mx-auto"
              >
                {isUpdate ? "Update" : "Create"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
