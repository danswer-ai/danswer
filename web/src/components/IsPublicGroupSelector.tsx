import React from "react";
import { FormikProps, FieldArray, ArrayHelpers } from "formik";
import { Text } from "@tremor/react";
import { FiUsers } from "react-icons/fi";
import { UserGroup } from "@/lib/types";
import { useUserGroups } from "@/lib/hooks";
import { BooleanFormField } from "@/components/admin/connectors/Field";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/user";
import { User, UserRole } from "@/lib/types";

export type IsPublicGroupSelectorFormType = {
  is_public: boolean;
  groups: number[];
};

export const IsPublicGroupSelector = <T extends IsPublicGroupSelectorFormType>({
  formikProps,
  objectName,
}: {
  formikProps: FormikProps<T>;
  objectName: string;
}) => {
  const { data: userGroups, isLoading: userGroupsIsLoading } = useUserGroups();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
        } else {
          console.error("Failed to fetch current user");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    formikProps.setFieldValue("is_public", false);
  }, []);

  return (
    <div className="mt-4">
      <BooleanFormField
        name="is_public"
        label="Is Public?"
        disabled={!isAdmin}
        subtext={
          <>
            If set, then {objectName}s indexed by this {objectName} will be
            visible to <b>all users</b>. If turned off, then only users who
            explicitly have been given access to the {objectName}s (e.g. through
            a User Group) will have access.
            {!isAdmin && (
              <span className="block mt-2 text-sm text-gray-500">
                Curators can't create public {objectName}s.
              </span>
            )}
          </>
        }
      />

      {!formikProps.values.is_public && (
        <>
          <Text className="mb-3">
            If any groups are specified, then this {objectName} will only be
            visible to the specified groups. If no groups are specified, then
            the
            {objectName} will be visible to all users.
          </Text>
          <FieldArray
            name="groups"
            render={(arrayHelpers: ArrayHelpers) => (
              <div className="flex gap-2 flex-wrap">
                {!userGroupsIsLoading &&
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
                  })}
              </div>
            )}
          />
        </>
      )}
    </div>
  );
};
