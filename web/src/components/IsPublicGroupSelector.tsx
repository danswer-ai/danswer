import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import React, { useState, useEffect } from "react";
import { FormikProps, FieldArray, ArrayHelpers, ErrorMessage } from "formik";
import { Text, Divider } from "@tremor/react";
import { FiUsers } from "react-icons/fi";
import { Teamspace, UserRole } from "@/lib/types";
import { useTeamspaces } from "@/lib/hooks";
import { BooleanFormField } from "@/components/admin/connectors/Field";
import { useUser } from "./user/UserProvider";
import { Combobox } from "./Combobox";

export type IsPublicGroupSelectorFormType = {
  is_public: boolean;
  groups: number[];
};

// This should be included for all forms that require groups / public access
// to be set, and access to this / permissioning should be handled within this component itself.
export const IsPublicGroupSelector = <T extends IsPublicGroupSelectorFormType>({
  formikProps,
  objectName,
  publicToWhom = "Users",
  enforceGroupSelection = true,
}: {
  formikProps: FormikProps<T>;
  objectName: string;
  publicToWhom?: string;
  enforceGroupSelection?: boolean;
}) => {
  const { data: teamspaces, isLoading: teamspacesIsLoading } = useTeamspaces();
  const { isAdmin, user, isLoadingUser } = useUser();
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();
  const [shouldHideContent, setShouldHideContent] = useState(false);

  useEffect(() => {
    if (user && teamspaces && isPaidEnterpriseFeaturesEnabled) {
      const isUserAdmin = user.role === UserRole.ADMIN;
      if (!isUserAdmin) {
        formikProps.setFieldValue("is_public", false);
      }
      if (teamspaces.length === 1 && !isUserAdmin) {
        formikProps.setFieldValue("groups", [teamspaces[0].id]);
        setShouldHideContent(true);
      } else if (formikProps.values.is_public) {
        formikProps.setFieldValue("groups", []);
        setShouldHideContent(false);
      } else {
        setShouldHideContent(false);
      }
    }
  }, [
    user,
    teamspaces,
    formikProps.setFieldValue,
    formikProps.values.is_public,
  ]);

  if (isLoadingUser || teamspacesIsLoading) {
    return <div>Loading...</div>;
  }
  if (!isPaidEnterpriseFeaturesEnabled) {
    return null;
  }

  if (shouldHideContent && enforceGroupSelection) {
    return (
      <>
        {teamspaces && (
          <div className="mb-1 text-base font-medium">
            This {objectName} will be assigned to group{" "}
            <b>{teamspaces[0].name}</b>.
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      <Divider />
      {isAdmin && (
        <>
          <BooleanFormField
            name="is_public"
            label={`Make this ${objectName} Public?`}
            disabled={!isAdmin}
            subtext={
              <span className="block mt-2 text-sm text-gray-500">
                If set, then this {objectName} will be usable by{" "}
                <b>All {publicToWhom}</b>. Otherwise, only <b>Admins</b> and{" "}
                <b>{publicToWhom}</b> who have explicitly been given access to
                this {objectName} (e.g. via a User Group) will have access.
              </span>
            }
            alignTop
          />
        </>
      )}

      {!formikProps.values.is_public &&
        teamspaces &&
        teamspaces?.length > 0 && (
          <>
            <div className="flex items-center mt-4 gap-x-2">
              <div className="block text-base font-medium">
                Assign group access for this {objectName}
              </div>
            </div>
            {teamspacesIsLoading ? (
              <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <Text className="mb-3">
                {isAdmin || !enforceGroupSelection ? (
                  <>
                    This {objectName} will be visible/accessible by the groups
                    selected below
                  </>
                ) : (
                  <>
                    Curators must select one or more groups to give access to
                    this {objectName}
                  </>
                )}
              </Text>
            )}
            {/* <FieldArray
              name="groups"
              render={(arrayHelpers: ArrayHelpers) => (
                <div className="flex flex-wrap gap-2 mb-4">
                  {teamspacesIsLoading ? (
                    <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    teamspaces &&
                    teamspaces.map((teamspace: Teamspace) => {
                      const ind = formikProps.values.groups.indexOf(
                        teamspace.id
                      );
                      let isSelected = ind !== -1;
                      return (
                        <div
                          key={teamspace.id}
                          className={`
                        px-3 
                        py-1
                        rounded-lg 
                        border
                        border-border 
                        w-fit 
                        flex 
                        cursor-pointer 
                        ${isSelected ? "bg-background-strong" : "hover:bg-hover"}
                      `}
                          onClick={() => {
                            if (isSelected) {
                              arrayHelpers.remove(ind);
                            } else {
                              arrayHelpers.push(teamspace.id);
                            }
                          }}
                        >
                          <div className="flex my-auto">
                            <FiUsers className="my-auto mr-2" />{" "}
                            {teamspace.name}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            /> */}

            <Combobox
              items={teamspaces.map((teamspace) => ({
                value: teamspace.id.toString(),
                label: teamspace.name,
              }))}
              onSelect={(selectedTeamspaceIds) => {
                const selectedIds = selectedTeamspaceIds.map((val) =>
                  parseInt(val, 10)
                );
                formikProps.setFieldValue("groups", selectedIds);
              }}
              placeholder="Select teamspaces"
              label="Teamspaces"
            />
            <ErrorMessage
              name="groups"
              component="div"
              className="mt-1 text-sm text-error"
            />
          </>
        )}
    </div>
  );
};
