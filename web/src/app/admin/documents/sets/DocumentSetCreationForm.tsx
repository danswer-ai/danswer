"use client";

import { ArrayHelpers, FieldArray, Form, Formik } from "formik";
import * as Yup from "yup";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import {
  createDocumentSet,
  updateDocumentSet,
  DocumentSetCreationRequest,
} from "./lib";
import { ConnectorIndexingStatus, DocumentSet, UserGroup } from "@/lib/types";
import { TextFormField } from "@/components/admin/connectors/Field";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { Button, Divider } from "@tremor/react";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { IsPublicGroupSelector } from "@/components/IsPublicGroupSelector";
import React, { useEffect } from "react";

interface SetCreationPopupProps {
  ccPairs: ConnectorIndexingStatus<any, any>[];
  userGroups: UserGroup[] | undefined;
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  existingDocumentSet?: DocumentSet;
}

export const DocumentSetCreationForm = ({
  ccPairs,
  userGroups,
  onClose,
  setPopup,
  existingDocumentSet,
}: SetCreationPopupProps) => {
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();
  const isUpdate = existingDocumentSet !== undefined;

  useEffect(() => {
    if (existingDocumentSet?.is_public) {
      return;
    }
  }, [existingDocumentSet?.is_public]);

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
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);
          // If the document set is public, then we don't want to send any groups
          const processedValues = {
            ...values,
            groups: values.is_public ? [] : values.groups,
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
            setPopup({
              message: isUpdate
                ? "Successfully updated document set!"
                : "Successfully created document set!",
              type: "success",
            });
            onClose();
          } else {
            const errorMsg = await response.text();
            setPopup({
              message: isUpdate
                ? `Error updating document set - ${errorMsg}`
                : `Error creating document set - ${errorMsg}`,
              type: "error",
            });
          }
        }}
      >
        {(props) => {
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
              {isPaidEnterpriseFeaturesEnabled &&
                userGroups &&
                userGroups.length > 0 && (
                  <IsPublicGroupSelector
                    formikProps={props}
                    objectName="document set"
                  />
                )}

              <Divider />

              <h2 className="mb-1 font-medium text-base">
                Pick your connectors:
              </h2>
              <p className="mb-3 text-xs">
                All documents indexed by the selected connectors will be a part
                of this document set.
              </p>
              <FieldArray
                name="cc_pair_ids"
                render={(arrayHelpers: ArrayHelpers) => {
                  // Filter visible cc pairs
                  const visibleCcPairs = ccPairs.filter(
                    (ccPair) =>
                      ccPair.public_doc ||
                      (ccPair.groups.length > 0 &&
                        props.values.groups.every((group) =>
                          ccPair.groups.includes(group)
                        ))
                  );

                  // Deselect filtered out cc pairs
                  const visibleCcPairIds = visibleCcPairs.map(
                    (ccPair) => ccPair.cc_pair_id
                  );
                  props.values.cc_pair_ids = props.values.cc_pair_ids.filter(
                    (id) => visibleCcPairIds.includes(id)
                  );

                  return (
                    <div className="mb-3 flex gap-2 flex-wrap">
                      {visibleCcPairs.map((ccPair) => {
                        const ind = props.values.cc_pair_ids.indexOf(
                          ccPair.cc_pair_id
                        );
                        let isSelected = ind !== -1;
                        return (
                          <div
                            key={`${ccPair.connector.id}-${ccPair.credential.id}`}
                            className={
                              `
                                    px-3 
                                    py-1
                                    rounded-lg 
                                    border
                                    border-border 
                                    w-fit 
                                    flex 
                                    cursor-pointer ` +
                              (isSelected
                                ? " bg-background-strong"
                                : " hover:bg-hover")
                            }
                            onClick={() => {
                              if (isSelected) {
                                arrayHelpers.remove(ind);
                              } else {
                                arrayHelpers.push(ccPair.cc_pair_id);
                              }
                            }}
                          >
                            <div className="my-auto">
                              <ConnectorTitle
                                connector={ccPair.connector}
                                ccPairId={ccPair.cc_pair_id}
                                ccPairName={ccPair.name}
                                isLink={false}
                                showMetadata={false}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />

              <div className="flex mt-6">
                <Button
                  type="submit"
                  disabled={props.isSubmitting}
                  className="w-64 mx-auto"
                >
                  {isUpdate ? "Update!" : "Create!"}
                </Button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};
