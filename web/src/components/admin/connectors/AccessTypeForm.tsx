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
import { SelectorFormField } from "./Field";

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
        "Only users who have expliticly been given access to this data source (through the Teamspace page) can access the documents pulled in by this data source",
    },
  ];

  if (isAdmin) {
    options.push({
      name: "Public",
      value: "public",
      description:
        "Everyone with an account on Arnold AI can access the documents pulled in by this data source",
    });
  }

  if (isAutoSyncSupported && isAdmin) {
    options.push({
      name: "Auto Sync",
      value: "sync",
      description:
        "We will automatically sync permissions from the source. A document will be searchable in Arnold AI if and only if the user performing the search has permission to access the document in the source.",
    });
  }

  return (
    <>
      {isPaidEnterpriseEnabled && isAdmin && (
        <>
          <SelectorFormField
            name="access_type"
            label="Document Access"
            options={options}
            subtext="Control who has access to the documents indexed by this data source."
            includeDefault={false}
            defaultValue={access_type.value}
            onSelect={(selected) =>
              access_type_helpers.setValue(selected as AccessType)
            }
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
    </>
  );
}
