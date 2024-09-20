import { Form, Formik } from "formik";
import * as Yup from "yup";
import { ConnectorIndexingStatus, User, Teamspace } from "@/lib/types";
import { TextFormField } from "@/components/admin/connectors/Field";
import { createTeamspace } from "./lib";
import { UserEditor } from "./UserEditor";
import { ConnectorEditor } from "./ConnectorEditor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSets } from "@/app/admin/documents/sets/hooks";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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

  const {
    data: documentSets,
    isLoading: isDocumentSetsLoading,
    error: documentSetsError,
    refreshDocumentSets,
  } = useDocumentSets();

  return (
    <div>
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
            <div className="pt-8 pb-4 space-y-2">
              <div className="flex justify-between">
                <p className="whitespace-nowrap w-[500px] font-semibold">
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

              <div className="flex justify-between pb-4">
                <p className="whitespace-nowrap w-[500px] font-semibold">
                  Teamspace Logo
                </p>
                <div className="flex items-center gap-4 w-full">
                  <input className="hidden" />
                  <Button>Upload</Button>
                  <b className="text-emphasis text-sm md:text-base">
                    Drag and drop a image.
                  </b>
                </div>
              </div>

              <div className="flex justify-between pb-4">
                <p className="whitespace-nowrap w-[500px] font-semibold">
                  Security Setting
                </p>
                <div className="flex items-center gap-4 w-full">
                  <Switch />
                  <p className="text-sm">
                    Activates private mode, chat and search activities
                    won&rsquo;t appear in the workspace admin&rsquo;s query
                    history
                  </p>
                </div>
              </div>

              <div className="flex justify-between pb-4">
                <p className="whitespace-nowrap w-[500px] font-semibold">
                  Setup Storage Size
                </p>
                <div className="w-full">
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option 1">Option 1</SelectItem>
                      <SelectItem value="option 2">Option 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pb-4">
                <p className="whitespace-nowrap w-[500px] font-semibold">
                  Set Token Rate Limit
                </p>
                <div className="flex items-center gap-2 w-full">
                  <Input placeholder="Token" />
                </div>
              </div>

              <div className="flex justify-between pb-4">
                <p className="whitespace-nowrap w-[500px] font-semibold">
                  Invite Users
                </p>
                <div className="flex items-center gap-2 w-full">
                  <Input placeholder="Enter email" />
                  <Select>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pb-4 pt-1">
                <h3 className="text-sm pb-1">
                  Select which connectors this group has access to:
                </h3>
                <p className="text-xs pb-2">
                  All documents indexed by the selected connectors will be
                  visible to users in this group.
                </p>

                <ConnectorEditor
                  allCCPairs={ccPairs}
                  selectedCCPairIds={values.cc_pair_ids}
                  setSetCCPairIds={(ccPairsIds) =>
                    setFieldValue("cc_pair_ids", ccPairsIds)
                  }
                />
              </div>
              <div className="pb-4 pt-1">
                <h3 className="text-sm pb-1">
                  Select which Users should be a part of this Group.
                </h3>
                <p className="text-xs">
                  All selected users will be able to search through all
                  documents indexed by the selected connectors.
                </p>
                <div>
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

              <div className="flex pt-4 justify-end">
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
