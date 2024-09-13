import { Form, Formik } from "formik";
import * as Yup from "yup";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { ConnectorIndexingStatus, User, Teamspace } from "@/lib/types";
import { TextFormField } from "@/components/admin/connectors/Field";
import { createTeamspace } from "./lib";
import { UserEditor } from "./UserEditor";
import { ConnectorEditor } from "./ConnectorEditor";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSets } from "@/app/admin/documents/sets/hooks";
import { orderAssistantsForUser } from "@/lib/assistants/orderAssistants";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { Badge } from "@/components/ui/badge";
import { Assistants } from "./Assistants";

interface TeamspaceCreationFormProps {
  onClose: () => void;
  users: User[];
  ccPairs: ConnectorIndexingStatus<any, any>[];
  existingTeamspace?: Teamspace;
  assistants: Assistant[];
}

export const TeamspaceCreationForm = ({
  onClose,
  users,
  ccPairs,
  existingTeamspace,
  assistants,
}: TeamspaceCreationFormProps) => {
  const isUpdate = existingTeamspace !== undefined;
  const { toast } = useToast();

  return (
    <div>
      <h2 className="text-xl font-bold flex">
        {isUpdate ? "Update a Teamspace" : "Create a new Teamspace"}
      </h2>

      <Formik
        initialValues={{
          name: existingTeamspace ? existingTeamspace.name : "",
          user_ids: [] as string[],
          cc_pair_ids: [] as number[],
        }}
        validationSchema={Yup.object().shape({
          name: Yup.string().required("Please enter a name for the group"),
          user_ids: Yup.array().of(Yup.string().required()),
          cc_pair_ids: Yup.array().of(Yup.number().required()),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);
          let response;
          response = await createTeamspace(values);
          formikHelpers.setSubmitting(false);
          if (response.ok) {
            toast({
              title: "Success",
              description: isUpdate
                ? "Successfully updated teamspace!"
                : "Successfully created teamspace!",
              variant: "success",
            });
            onClose();
          } else {
            const responseJson = await response.json();
            const errorMsg = responseJson.detail || responseJson.message;
            toast({
              title: "Error",
              description: isUpdate
                ? `Error updating teamspace - ${errorMsg}`
                : `Error creating teamspace - ${errorMsg}`,
              variant: "destructive",
            });
          }
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <div className="py-4">
              <TextFormField
                name="name"
                label="Name:"
                placeholder="A name for the Teamspace"
                disabled={isUpdate}
                autoCompleteDisabled={true}
              />

              <h2 className="mb-1 font-medium">
                Select which connectors this group has access to:
              </h2>
              <p className="mb-3 text-xs">
                All documents indexed by the selected connectors will be visible
                to users in this group.
              </p>

              <ConnectorEditor
                allCCPairs={ccPairs}
                selectedCCPairIds={values.cc_pair_ids}
                setSetCCPairIds={(ccPairsIds) =>
                  setFieldValue("cc_pair_ids", ccPairsIds)
                }
              />

              {/* <div>
                <h2 className="mb-1 font-medium">Assistants</h2>
                <p className="mb-3 text-xs">
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                </p>
                <Assistants assistants={assistants} />
              </div> */}

              <h2 className="mb-1 font-medium">
                Select which Users should be a part of this Group.
              </h2>
              <p className="mb-3 text-xs">
                All selected users will be able to search through all documents
                indexed by the selected connectors.
              </p>
              <div className="mb-3 gap-2">
                <UserEditor
                  selectedUserIds={values.user_ids}
                  setSelectedUserIds={(userIds) =>
                    setFieldValue("user_ids", userIds)
                  }
                  allUsers={users}
                  existingUsers={[]}
                />
              </div>

              <div className="flex pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mx-auto w-64"
                >
                  {isUpdate ? "Update!" : "Create!"}
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
