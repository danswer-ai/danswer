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
import { FileUpload } from "@/components/admin/connectors/FileUpload";
import { useState } from "react";
import { DocumentSets } from "./DocumentSets";
import { Assistants } from "./Assistants";
import { Input } from "@/components/ui/input";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { useRouter } from "next/navigation";

interface TeamspaceCreationFormProps {
  onClose: () => void;
  users: User[];
  ccPairs: ConnectorIndexingStatus<any, any>[] | undefined;
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [tokenBudget, setTokenBudget] = useState(0);
  const [periodHours, setPeriodHours] = useState(0);
  const isUpdate = existingTeamspace !== undefined;
  const { toast } = useToast();

  const setTokenRateLimit = async (teamspaceId: number) => {
    const response = await fetch(
      `/api/admin/token-rate-limits/teamspace/${teamspaceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: true,
          token_budget: tokenBudget,
          period_hours: periodHours,
        }),
      }
    );

    if (!response.ok) {
      const errorMsg =
        (await response.json()).detail || "Failed to set token rate limit.";
      toast({
        title: "Operation Failed",
        description: `Could not set token rate limit: ${errorMsg}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Token Rate Limit Set",
      description: "The token rate limit has been successfully set.",
      variant: "success",
    });
  };

  return (
    <div>
      <Formik
        initialValues={{
          name: existingTeamspace ? existingTeamspace.name : "",
          user_ids: [] as string[],
          cc_pair_ids: [] as number[],
          document_set_ids: [] as number[],
          assistant_ids: [] as string[],
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().required("Please enter a name for the group"),
          user_ids: Yup.array().of(Yup.string().required()),
          cc_pair_ids: Yup.array().of(Yup.number().required()),
          document_set_ids: Yup.array().of(Yup.number().required()),
          assistant_ids: Yup.array().of(Yup.number().required()),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);

          let response;
          response = await createTeamspace(values);
          formikHelpers.setSubmitting(false);
          if (response.ok) {
            const { id } = await response.json();

            await setTokenRateLimit(id);
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
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <div className="pt-8 space-y-6">
              <div className="flex justify-between gap-2 flex-col lg:flex-row">
                <p className="whitespace-nowrap w-1/2 font-semibold">
                  Teamspace Name
                </p>
                <TextFormField
                  name="name"
                  placeholder="A name for the Teamspace"
                  disabled={isUpdate}
                  autoCompleteDisabled={true}
                  fullWidth
                />
              </div>

              <div className="flex justify-between gap-2 flex-col lg:flex-row">
                <p className="whitespace-nowrap w-1/2 font-semibold">
                  Teamspace Logo
                </p>
                <div className="flex items-center gap-2 w-full">
                  <FileUpload
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                  />
                </div>
              </div>

              <div className="flex justify-between pb-4 gap-2 flex-col lg:flex-row">
                <p className="whitespace-nowrap w-1/2 font-semibold">
                  Select Users
                </p>
                <div className="w-full">
                  <UserEditor
                    selectedUserIds={values.user_ids}
                    setSelectedUserIds={(userIds) =>
                      setFieldValue("user_ids", userIds)
                    }
                    allUsers={users}
                    existingUsers={[]}
                  />
                </div>
              </div>

              <div className="flex justify-between pb-4 gap-2 flex-col lg:flex-row">
                <p className="whitespace-nowrap w-1/2 font-semibold">
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

              <div className="flex justify-between pb-4 gap-2 flex-col lg:flex-row">
                <p className="whitespace-nowrap w-1/2 font-semibold">
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

              <div className="flex justify-between pb-4 gap-2 flex-col lg:flex-row">
                <p className="whitespace-nowrap w-1/2 font-semibold">
                  Select connectors
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

              <div className="flex justify-between pb-4 gap-2 flex-col lg:flex-row">
                <p className="whitespace-nowrap w-1/2 font-semibold">
                  Set Token Rate Limit
                </p>
                <div className="flex items-center gap-4 w-full">
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
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <Button
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
