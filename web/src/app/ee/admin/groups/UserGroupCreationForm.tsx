import { ArrayHelpers, FieldArray, Form, Formik } from "formik";
import * as Yup from "yup";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { ConnectorIndexingStatus, DocumentSet, User } from "@/lib/types";
import { TextFormField } from "@/components/admin/connectors/Field";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { createUserGroup } from "./lib";
import { UserGroup } from "./types";
import { UserEditor } from "./UserEditor";
import { ConnectorEditor } from "./ConnectorEditor";

interface UserGroupCreationFormProps {
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  users: User[];
  ccPairs: ConnectorIndexingStatus<any, any>[];
  existingUserGroup?: UserGroup;
}

export const UserGroupCreationForm = ({
  onClose,
  setPopup,
  users,
  ccPairs,
  existingUserGroup,
}: UserGroupCreationFormProps) => {
  const isUpdate = existingUserGroup !== undefined;

  return (
    <div>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30"
        onClick={onClose}
      >
        <div
          className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg relative w-1/2 text-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <Formik
            initialValues={{
              name: existingUserGroup ? existingUserGroup.name : "",
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
              response = await createUserGroup(values);
              formikHelpers.setSubmitting(false);
              if (response.ok) {
                setPopup({
                  message: isUpdate
                    ? "Successfully updated user group!"
                    : "Successfully created user group!",
                  type: "success",
                });
                onClose();
              } else {
                const responseJson = await response.json();
                const errorMsg = responseJson.detail || responseJson.message;
                setPopup({
                  message: isUpdate
                    ? `Error updating user group - ${errorMsg}`
                    : `Error creating user group - ${errorMsg}`,
                  type: "error",
                });
              }
            }}
          >
            {({ isSubmitting, values, setFieldValue }) => (
              <Form>
                <h2 className="text-xl font-bold mb-3 border-b border-gray-600 pt-4 pb-3 bg-gray-700 px-6">
                  {isUpdate ? "Update a User Group" : "Create a new User Group"}
                </h2>
                <div className="p-4">
                  <TextFormField
                    name="name"
                    label="Name:"
                    placeholder="A name for the User Group"
                    disabled={isUpdate}
                    autoCompleteDisabled={true}
                  />
                  <div className="border-t border-gray-600 py-2" />
                  <h2 className="mb-1 font-medium">
                    Select which connectors this group has access to:
                  </h2>
                  <p className="mb-3 text-xs">
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

                  <div className="border-t border-gray-600 py-2" />

                  <h2 className="mb-1 font-medium">
                    Select which Users should be a part of this Group.
                  </h2>
                  <p className="mb-3 text-xs">
                    All selected users will be able to search through all
                    documents indexed by the selected connectors.
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
                  <div className="flex">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={
                        "bg-slate-500 hover:bg-slate-700 text-white " +
                        "font-bold py-2 px-4 rounded focus:outline-none " +
                        "focus:shadow-outline w-full max-w-sm mx-auto"
                      }
                    >
                      {isUpdate ? "Update!" : "Create!"}
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};
