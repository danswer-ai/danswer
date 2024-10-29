import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import React, { useState, useEffect } from "react";
import { FieldArray, ArrayHelpers, ErrorMessage, useField } from "formik";
import { Text, Divider } from "@tremor/react";
import { FiUsers } from "react-icons/fi";
import { Teamspace, User, UserRole } from "@/lib/types";
import { useTeamspaces } from "@/lib/hooks";
import { AccessType } from "@/lib/types";
import { useUser } from "@/components/user/UserProvider";
import { Combobox } from "@/components/Combobox";

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
            <Combobox
              items={teamspaces.map((teamspace) => ({
                value: teamspace.id.toString(),
                label: teamspace.name,
              }))}
              onSelect={(selectedTeamspaceIds) => {
                const selectedIds = selectedTeamspaceIds.map((val) =>
                  parseInt(val, 10)
                );
                groups_helpers.setValue(selectedIds);
              }}
              placeholder="Select teamspaces"
              label="Teamspaces"
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
