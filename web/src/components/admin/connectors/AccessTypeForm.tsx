import { DefaultDropdown } from "@/components/Dropdown";
import {
  AccessType,
  ValidAutoSyncSources,
  ConfigurableSources,
  validAutoSyncSources,
} from "@/lib/types";
import { Text, Title } from "@tremor/react";
import { useField } from "formik";
import { AutoSyncOptions } from "./AutoSyncOptions";

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

  const isAutoSyncSupported = isValidAutoSyncSource(connector);

  const options = [
    {
      name: "Public",
      value: "public",
      description:
        "Everyone with an account on Danswer can access the documents pulled in by this connector",
    },
    {
      name: "Private",
      value: "private",
      description:
        "Only users who have expliticly been given access to this connector (through the User Groups page) can access the documents pulled in by this connector",
    },
  ];

  if (isAutoSyncSupported) {
    options.push({
      name: "Auto Sync",
      value: "sync",
      description:
        "We will automatically sync permissions from the source. A document will be searchable in Danswer if and only if the user performing the search has permission to access the document in the source.",
    });
  }

  return (
    <div>
      <Title className="mb-2">Document Access</Title>
      <Text className="mb-2">
        Control who has access to the documents indexed by this connector.
      </Text>

      <DefaultDropdown
        options={options}
        selected={access_type.value}
        onSelect={(selected) =>
          access_type_helpers.setValue(selected as AccessType)
        }
        includeDefault={false}
      />

      {access_type.value === "sync" && isAutoSyncSupported && (
        <div className="mt-6">
          <AutoSyncOptions connectorType={connector as ValidAutoSyncSources} />
        </div>
      )}
    </div>
  );
}
