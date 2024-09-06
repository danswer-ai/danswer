import { DefaultDropdown } from "@/components/Dropdown";
import { AccessType } from "@/lib/types";
import { Text, Title } from "@tremor/react";

export function AccessTypeForm({
  autoSyncFields,
  selectedAccessType,
  setSelectedAccessType,
}: {
  selectedAccessType: AccessType;
  setSelectedAccessType: (accessType: AccessType) => void;
  autoSyncFields?: JSX.Element;
}) {
  return (
    <div>
      <Title className="mb-2">Document Access</Title>
      <Text className="mb-2">
        Control who has access to the documents indexed by this connector.
      </Text>

      <DefaultDropdown
        options={[
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
          {
            name: "Auto Sync",
            value: "sync",
            description:
              "We will automatically sync permissions from the source. A document will be searchable in Danswer if and only if the user performing the search has permission to access the document in the source.",
          },
        ]}
        selected={selectedAccessType}
        onSelect={(selected) => setSelectedAccessType(selected as AccessType)}
        includeDefault={false}
      />

      {selectedAccessType === "sync" && (
        <div className="mt-6">{autoSyncFields}</div>
      )}
    </div>
  );
}
