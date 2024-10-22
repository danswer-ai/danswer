import { DefaultDropdown } from "@/components/Dropdown";
import {
  AccessType,
  ValidAutoSyncSources,
  ConfigurableSources,
  validAutoSyncSources,
} from "@/lib/types";
import { useUser } from "@/components/user/UserProvider";
import { useField } from "formik";
import { AutoSyncOptions } from "./AutoSyncOptions";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";

function isValidAutoSyncSource(
  value: ConfigurableSources
): value is ValidAutoSyncSources {
  return validAutoSyncSources.includes(value as ValidAutoSyncSources);
}

export function AccessTypeForm({
  connector,
}: {
  connector: ConfigurableSources;
}) {
  const [access_type, meta, access_type_helpers] =
    useField<AccessType>("access_type");

  const isPaidEnterpriseEnabled = usePaidEnterpriseFeaturesEnabled();
  const isAutoSyncSupported = isValidAutoSyncSource(connector);
  const { isLoadingUser, isAdmin } = useUser();

  const options = [
    {
      name: "Private",
      value: "private",
      description:
        "Only users who have expliticly been given access to this connector (through the User Groups page) can access the documents pulled in by this connector",
    },
  ];

  if (isAdmin) {
    options.push({
      name: "Public",
      value: "public",
      description:
        "Everyone with an account on enMedD AI can access the documents pulled in by this connector",
    });
  }

  if (isAutoSyncSupported && isAdmin) {
    options.push({
      name: "Auto Sync",
      value: "sync",
      description:
        "We will automatically sync permissions from the source. A document will be searchable in enMedD AI if and only if the user performing the search has permission to access the document in the source.",
    });
  }

  return (
    <>
      {isPaidEnterpriseEnabled && (
        <>
          <div>
            <div className="flex items-center gap-x-2">
              <label className="font-medium text-text-950">
                Document Access
              </label>
            </div>
            <p className="mb-2 text-sm text-text-500">
              Control who has access to the documents indexed by this connector.
            </p>

            {isAdmin && (
              <>
                <DefaultDropdown
                  options={options}
                  selected={access_type.value}
                  onSelect={(selected) =>
                    access_type_helpers.setValue(selected as AccessType)
                  }
                  includeDefault={false}
                />

                {access_type.value === "sync" && isAutoSyncSupported && (
                  <div>
                    <AutoSyncOptions
                      connectorType={connector as ValidAutoSyncSources}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
