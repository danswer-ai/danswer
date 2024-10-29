import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import React, { useState, useEffect } from "react";
import { FieldArray, ArrayHelpers, ErrorMessage, useField } from "formik";
import { Text, Divider } from "@tremor/react";
import { FiUsers } from "react-icons/fi";
import { Teamspace, User, UserRole } from "@/lib/types";
import { useTeamspaces } from "@/lib/hooks";
import { AccessType } from "@/lib/types";
import { useUser } from "@/components/user/UserProvider";

// This should be included for all forms that require groups / public access
// to be set, and access to this / permissioning should be handled within this component itself.

export type AccessTypeGroupSelectorFormType = {
  access_type: AccessType;
  groups: number[];
};

export function AccessTypeGroupSelector({}: {}) {
  const { data: teamspaces, isLoading: teamspacesIsLoading } = useTeamspaces();
  const { isAdmin, user, isLoadingUser } = useUser();
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();
  const [shouldHideContent, setShouldHideContent] = useState(false);

  const [access_type, meta, access_type_helpers] =
    useField<AccessType>("access_type");
  const [groups, groups_meta, groups_helpers] = useField<number[]>("groups");

  useEffect(() => {
    if (user && teamspaces && isPaidEnterpriseFeaturesEnabled) {
      const isUserAdmin = user.role === UserRole.ADMIN;
      if (!isPaidEnterpriseFeaturesEnabled) {
        access_type_helpers.setValue("public");
        return;
      }
      if (!isUserAdmin) {
        access_type_helpers.setValue("private");
      }
      if (teamspaces.length === 1 && !isUserAdmin) {
        groups_helpers.setValue([teamspaces[0].id]);
        setShouldHideContent(true);
      } else if (access_type.value !== "private") {
        groups_helpers.setValue([]);
        setShouldHideContent(false);
      } else {
        setShouldHideContent(false);
      }
    }
  }, [user, teamspaces, access_type.value]);

  if (isLoadingUser || teamspacesIsLoading) {
    return <div>Loading...</div>;
  }
  if (!isPaidEnterpriseFeaturesEnabled) {
    return null;
  }

  if (shouldHideContent) {
    return (
      <>
        {teamspaces && (
          <div className="mb-1 font-medium text-base">
            This Connector will be assigned to group <b>{teamspaces[0].name}</b>
            .
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {access_type.value === "private" &&
        teamspaces &&
        teamspaces?.length > 0 && (
          <>
            <Divider />
            <div className="flex mt-4 gap-x-2 items-center">
              <div className="block font-medium text-base">
                Assign group access for this Connector
              </div>
            </div>
            {teamspacesIsLoading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
            ) : (
              <Text className="mb-3">
                {isAdmin ? (
                  <>
                    This Connector will be visible/accessible by the groups
                    selected below
                  </>
                ) : (
                  <>
                    Curators must select one or more groups to give access to
                    this Connector
                  </>
                )}
              </Text>
            )}
            <FieldArray
              name="groups"
              render={(arrayHelpers: ArrayHelpers) => (
                <div className="flex gap-2 flex-wrap mb-4">
                  {teamspacesIsLoading ? (
                    <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
                  ) : (
                    teamspaces &&
                    teamspaces.map((teamspace: Teamspace) => {
                      const ind = groups.value.indexOf(teamspace.id);
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
                          <div className="my-auto flex">
                            <FiUsers className="my-auto mr-2" />{" "}
                            {teamspace.name}
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
}
