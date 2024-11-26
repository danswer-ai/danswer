"use client";

import { Form, Formik } from "formik";
import * as Yup from "yup";
import {
  ConnectorIndexingStatus,
  User,
  Teamspace,
  DocumentSet,
} from "@/lib/types";
import { TextFormField } from "@/components/admin/connectors/Field";
import { createTeamspace } from "./lib";
import { UserEditor } from "./UserEditor";
import { ConnectorEditor } from "./ConnectorEditor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { useState } from "react";
import { DocumentSets } from "./DocumentSets";
import { Assistants } from "./Assistants";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/app/admin/settings/ImageUpload";
import { useUser } from "@/components/user/UserProvider";

interface TeamspaceCreationFormProps {
  onClose: () => void;
  users: User[];
  ccPairs: ConnectorIndexingStatus<any, any>[];
  existingTeamspace?: Teamspace;
  assistants: Assistant[];
  documentSets: DocumentSet[] | undefined;
}

export const TeamspaceCreationForm = ({
  onClose,
  users,
  ccPairs,
  existingTeamspace,
  assistants,
  documentSets,
}: TeamspaceCreationFormProps) => {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File | null>(null);
  const { user } = useUser();
  // const [tokenBudget, setTokenBudget] = useState(0);
  // const [periodHours, setPeriodHours] = useState(0);
  const isUpdate = existingTeamspace !== undefined;
  const { toast } = useToast();

  const uploadLogo = async (teamspaceId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `/api/manage/admin/teamspace/logo?teamspace_id=${teamspaceId}`,
      {
        method: "PUT",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorMsg =
        (await response.json()).detail || "Failed to upload logo.";
      throw new Error(errorMsg);
    }

    return response.json();
  };

  return (
    <div>
      <Formik
        initialValues={{
          name: existingTeamspace ? existingTeamspace.name : "",
          users: [] as { user_id: string; role: string }[],
          cc_pair_ids: [] as number[],
          document_set_ids: [] as number[],
          assistant_ids: [] as number[],
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().required("Please enter a name for the group"),
          users: Yup.array().of(
            Yup.object().shape({
              user_id: Yup.string().required("User ID is required"),
              role: Yup.string()
                .oneOf(["basic", "admin"], "Role must be 'basic' or 'admin'")
                .required("Role is required"),
            })
          ),
          cc_pair_ids: Yup.array().of(Yup.number().required()),
          document_set_ids: Yup.array().of(Yup.number().required()),
          assistant_ids: Yup.array().of(Yup.number().required()),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);

          if (values.users.length === 0) {
            formikHelpers.setSubmitting(false);
            toast({
              title: "Operation Failed",
              description: "Please select at least one user with a role",
              variant: "destructive",
            });
            return;
          }

          if (values.assistant_ids.length === 0) {
            formikHelpers.setSubmitting(false);
            toast({
              title: "Operation Failed",
              description: "Please select an assistant",
              variant: "destructive",
            });
            return;
          }

          let response;
          try {
            response = await createTeamspace(values);
            formikHelpers.setSubmitting(false);

            if (response.ok) {
              const { id } = await response.json();

              if (selectedFiles) {
                await uploadLogo(id, selectedFiles);
              }

              router.refresh();
              toast({
                title: isUpdate ? "Teamspace Updated!" : "Teamspace Created!",
                description: isUpdate
                  ? "Your teamspace has been updated successfully."
                  : "Your new teamspace has been created successfully.",
                variant: "success",
              });

              onClose();
            } else {
              const responseJson = await response.json();
              const errorMsg = responseJson.detail || responseJson.message;
              toast({
                title: "Operation Failed",
                description: isUpdate
                  ? `Could not update the teamspace: ${errorMsg}`
                  : `Could not create the teamspace: ${errorMsg}`,
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error(error);
            formikHelpers.setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-2 lg:flex-row">
                <p className="w-1/2 font-semibold whitespace-nowrap">Name</p>
                <TextFormField
                  name="name"
                  placeholder="Teamspace name"
                  disabled={isUpdate}
                  autoCompleteDisabled={true}
                  fullWidth
                />
              </div>

              <div className="flex flex-col justify-between gap-2 lg:flex-row pb-6">
                <p className="w-1/2 font-semibold whitespace-nowrap">Logo</p>
                <div className="flex items-center w-full gap-2">
                  <ImageUpload
                    selectedFile={selectedFiles}
                    setSelectedFile={setSelectedFiles}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-2 pb-4 lg:flex-row">
                <p className="w-1/2 font-semibold whitespace-nowrap">
                  Select members
                </p>
                <div className="w-full">
                  <UserEditor
                    selectedUserIds={values.users.map((user) => user.user_id)}
                    allUsers={users}
                    existingUsers={values.users}
                    onAddUser={(newUser) => {
                      setFieldValue("users", [...values.users, newUser]);
                    }}
                    onRemoveUser={(userId) => {
                      setFieldValue(
                        "users",
                        values.users.filter((user) => user.user_id !== userId)
                      );
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-2 pb-4 lg:flex-row">
                <p className="w-1/2 font-semibold whitespace-nowrap">
                  Select assistants
                </p>
                <div className="w-full">
                  <Assistants
                    assistants={assistants}
                    onSelect={(selectedAssistantIds) => {
                      setFieldValue("assistant_ids", selectedAssistantIds);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-2 pb-4 lg:flex-row">
                <p className="w-1/2 font-semibold whitespace-nowrap">
                  Select document sets
                </p>
                <div className="w-full">
                  <DocumentSets
                    documentSets={documentSets}
                    setSelectedDocumentSetIds={(documentSetIds) =>
                      setFieldValue("document_set_ids", documentSetIds)
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between gap-2 pb-4 lg:flex-row">
                <p className="w-1/2 font-semibold whitespace-nowrap">
                  Select data sources
                </p>
                <div className="w-full">
                  <ConnectorEditor
                    allCCPairs={ccPairs}
                    selectedCCPairIds={values.cc_pair_ids}
                    setSetCCPairIds={(ccPairsIds) =>
                      setFieldValue("cc_pair_ids", ccPairsIds)
                    }
                  />
                </div>
              </div>

              {/* <div className="flex flex-col justify-between gap-2 pb-4 lg:flex-row">
                <p className="w-1/2 font-semibold whitespace-nowrap">

                  Set Token Rate Limit
                </p>
                <div className="flex items-center w-full gap-4">
                  <Input
                    placeholder="Time Window (Hours)"
                    type="number"
                    value={periodHours}
                    onChange={(e) => setPeriodHours(Number(e.target.value))}
                  />
                  <Input
                    placeholder="Token Budget (Thousands)"
                    type="number"
                    value={tokenBudget}
                    onChange={(e) => setTokenBudget(Number(e.target.value))}
                  />
                </div>
              </div> */}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  disabled={isSubmitting}
                  className=""
                  onClick={onClose}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="">
                  {isUpdate ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
