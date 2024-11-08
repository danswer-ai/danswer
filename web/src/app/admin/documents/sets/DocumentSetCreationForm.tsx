"use client";

import { Form, Formik } from "formik";
import * as Yup from "yup";
import { ConnectorIndexingStatus, DocumentSet, Teamspace } from "@/lib/types";
import {
  createDocumentSet,
  updateDocumentSet,
  DocumentSetCreationRequest,
} from "./lib";
import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Divider } from "@/components/Divider";
import { useUser } from "@/components/user/UserProvider";
import { Combobox } from "@/components/Combobox";

interface SetCreationPopupProps {
  ccPairs: ConnectorIndexingStatus<any, any>[];
  teamspaces: Teamspace[] | undefined;
  onClose: () => void;
  existingDocumentSet?: DocumentSet;
  teamspaceId?: string | string[];
}

export const DocumentSetCreationForm = ({
  ccPairs,
  teamspaces,
  onClose,
  existingDocumentSet,
  teamspaceId,
}: SetCreationPopupProps) => {
  const { toast } = useToast();
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();
  const isUpdate = existingDocumentSet !== undefined;
  const [localCcPairs, setLocalCcPairs] = useState(ccPairs);
  const { user } = useUser();

  useEffect(() => {
    if (existingDocumentSet?.is_public) {
      return;
    }
  }, [existingDocumentSet?.is_public]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredCcPairs = ccPairs.filter((ccPair) =>
    ccPair.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const connectorItems = filteredCcPairs.map((ccPair) => ({
    value: ccPair.cc_pair_id.toString(),
    label: ccPair.name || `Connector ${ccPair.cc_pair_id}`,
  }));

  return (
    <div>
      <Formik<DocumentSetCreationRequest>
        initialValues={{
          name: existingDocumentSet?.name ?? "",
          description: existingDocumentSet?.description ?? "",
          cc_pair_ids:
            existingDocumentSet?.cc_pair_descriptors.map(
              (ccPairDescriptor) => ccPairDescriptor.id
            ) ?? [],
          is_public: existingDocumentSet?.is_public ?? true,
          users: existingDocumentSet?.users ?? [],
          groups: existingDocumentSet?.groups ?? [],
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().required("Please enter a name for the set"),
          description: Yup.string().required(
            "Please enter a description for the set"
          ),
          cc_pair_ids: Yup.array()
            .of(Yup.number().required())
            .required("Please select at least one connector"),
          groups: Yup.array().of(Yup.number()),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);
          const processedValues = {
            ...values,
            groups: teamspaceId
              ? [Number(teamspaceId)]
              : values.is_public
                ? []
                : values.groups,
          };

          let response;
          if (isUpdate) {
            response = await updateDocumentSet({
              id: existingDocumentSet.id,
              ...processedValues,
              users: processedValues.users,
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
        {({ isSubmitting, values, setFieldValue }) => {
          useEffect(() => {
            if (teamspaceId) {
              setFieldValue("is_public", false);
            }
          }, [teamspaceId, setFieldValue]);

          return (
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
                <p className="mb-1 text-sm font-semibold">
                  Pick your connectors:
                </p>
                <Combobox
                  items={connectorItems}
                  onSelect={(selectedValues) => {
                    const selectedIds = selectedValues.map((val) =>
                      parseInt(val, 10)
                    );
                    setFieldValue("cc_pair_ids", selectedIds);
                  }}
                  placeholder="Search connectors"
                  label="Select data sources"
                  selected={values.cc_pair_ids.map((id) => id.toString())}
                />
              </div>

              {teamspaces && teamspaces.length > 0 && !teamspaceId && (
                <div>
                  <Divider />
                  <BooleanFormField
                    name="is_public"
                    label="Is Public?"
                    subtext={
                      <>
                        If the document set is public, it will be visible to{" "}
                        <b>all users</b>. If not, only users in the specified
                        teamspace will be able to see it.
                      </>
                    }
                    alignTop
                  />
                  {!values.is_public && (
                    <>
                      <h3 className="mb-1 text-sm">Teamspace with Access</h3>
                      <p className="mb-2 text-sm text-muted-foreground">
                        If any teamspaces are specified, this Document Set will
                        be visible only to them. If none, it will be visible to
                        all users.
                      </p>
                      <Combobox
                        items={teamspaces.map((teams) => ({
                          value: teams.id.toString(),
                          label: teams.name,
                        }))}
                        onSelect={(selectedTeamspaceIds) => {
                          const selectedIds = selectedTeamspaceIds.map((val) =>
                            parseInt(val, 10)
                          );
                          setFieldValue("groups", selectedIds);
                        }}
                        placeholder="Select teamspaces"
                        label="Teamspaces"
                        selected={values.groups.map((group) =>
                          group.toString()
                        )}
                      />
                    </>
                  )}
                </div>
              )}

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
          );
        }}
      </Formik>
    </div>
  );
};
