import { createConnector, runConnector } from "@/lib/connector";
import { createCredential, linkCredential } from "@/lib/credential";
import { FileConfig } from "@/lib/connectors/connectors";

export const submitFiles = async (
  selectedFiles: File[],
  setSelectedFiles: (files: File[]) => void,
  name: string,
  isPublic: boolean,
  groups?: number[]
) => {
  const formData = new FormData();

  selectedFiles.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch("/api/manage/admin/connector/file/upload", {
    method: "POST",
    body: formData,
  });
  const responseJson = await response.json();
  if (!response.ok) {
    console.log(`Unable to upload files - ${responseJson.detail}`)
    return;
  }

  const filePaths = responseJson.file_paths as string[];

  const [connectorErrorMsg, connector] = await createConnector<FileConfig>({
    name: "FileConnector-" + Date.now(),
    source: "file",
    input_type: "load_state",
    connector_specific_config: {
      file_locations: filePaths,
    },
    refresh_freq: null,
    prune_freq: null,
    indexing_start: null,
    is_public: isPublic,
    groups: groups,
  });
  if (connectorErrorMsg || !connector) {
    console.log(`Unable to create connector - ${connectorErrorMsg}`)
    return;
  }

  // Since there is no "real" credential associated with a file connector
  // we create a dummy one here so that we can associate the CC Pair with a
  // user. This is needed since the user for a CC Pair is found via the credential
  // associated with it.
  const createCredentialResponse = await createCredential({
    credential_json: {},
    admin_public: true,
    source: "file",
    curator_public: isPublic,
    groups: groups,
    name,
  });
  if (!createCredentialResponse.ok) {
    const errorMsg = await createCredentialResponse.text();
    console.log(`Error creating credential for CC Pair - ${errorMsg}`)
    return;
    false;
  }
  const credentialId = (await createCredentialResponse.json()).id;

  const credentialResponse = await linkCredential(
    connector.id,
    credentialId,
    name,
    isPublic ? "public" : "private",
    groups
  );
  if (!credentialResponse.ok) {
    const credentialResponseJson = await credentialResponse.json();
    console.log(`Unable to link connector to credential - ${credentialResponseJson.detail}`)
    return false;
  }

  const runConnectorErrorMsg = await runConnector(connector.id, [0]);
  if (runConnectorErrorMsg) {
    console.log(`Unable to run connector - ${runConnectorErrorMsg}`)
    return false;
  }

  setSelectedFiles([]);
  return true;
};
