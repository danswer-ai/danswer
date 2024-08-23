import React, { useState, useEffect } from "react";
import { FormikProps, FieldArray, ArrayHelpers, ErrorMessage } from "formik";
import { Text, Divider } from "@tremor/react";
import { FiUsers } from "react-icons/fi";
import { UserGroup, User, UserRole } from "@/lib/types";
import { useUserGroups } from "@/lib/hooks";
import { BooleanFormField } from "@/components/admin/connectors/Field";
import { getCurrentUser } from "@/lib/user";

export type IsPublicGroupSelectorFormType = {
  is_public: boolean;
  groups: number[];
};

export const IsPublicGroupSelector = <T extends IsPublicGroupSelectorFormType>({
  formikProps,
  objectName,
  enforceGroupSelection = true,
}: {
  formikProps: FormikProps<T>;
  objectName: string;
  enforceGroupSelection?: boolean;
}) => {
  const { data: userGroups, isLoading: userGroupsIsLoading } = useUserGroups();
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          formikProps.setFieldValue("is_public", user.role === UserRole.ADMIN);

          // Select the only group by default if there's only one
          if (
            userGroups &&
            userGroups.length === 1 &&
            formikProps.values.groups.length === 0 &&
            user.role !== UserRole.ADMIN
          ) {
            formikProps.setFieldValue("groups", [userGroups[0].id]);
          }
        } else {
          console.error("Failed to fetch current user");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCurrentUser();
  }, [userGroups]); // Add userGroups as a dependency

  if (isLoading || userGroupsIsLoading) {
    return null; // or return a loading spinner if preferred
  }

  return (
    <div>
      <Divider />
      {isAdmin && (
        <>
          <BooleanFormField
            name="is_public"
            label="Is Public?"
            disabled={!isAdmin}
            subtext={
              <span className="block mt-2 text-sm text-gray-500">
                If set, then {objectName}s indexed by this {objectName} will be
                visible to <b>all users</b>. If turned off, then only users who
                explicitly have been given access to the {objectName}s (e.g.
                through a User Group) will have access.
              </span>
            }
          />
        </>
      )}

      {(!formikProps.values.is_public || !isAdmin) && (
        <>
          <div className="flex gap-x-2 items-center">
            <div className="block font-medium text-base">
              Assign group access for this {objectName}
            </div>
          </div>
          <Text className="mb-3">
            {isAdmin || !enforceGroupSelection ? (
              <>
                This {objectName} will be visible/accessible by the groups
                selected below
              </>
            ) : (
              <>
                Curators must select one or more groups to give access to this{" "}
                {objectName}
              </>
            )}
          </Text>
          <FieldArray
            name="groups"
            render={(arrayHelpers: ArrayHelpers) => (
              <div className="flex gap-2 flex-wrap mb-4">
                {userGroupsIsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
                ) : (
                  userGroups &&
                  userGroups.map((userGroup: UserGroup) => {
                    const ind = formikProps.values.groups.indexOf(userGroup.id);
                    let isSelected = ind !== -1;
                    return (
                      <div
                        key={userGroup.id}
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
                            arrayHelpers.push(userGroup.id);
                          }
                        }}
                      >
                        <div className="my-auto flex">
                          <FiUsers className="my-auto mr-2" /> {userGroup.name}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          />
          <ErrorMessage
            name="groups"
            component="div"
            className="text-error text-sm mt-1"
          />
        </>
      )}
    </div>
  );
};
