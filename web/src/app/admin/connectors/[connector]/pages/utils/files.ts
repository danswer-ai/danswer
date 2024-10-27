import { createConnector, runConnector } from "@/lib/connector";
import { createCredential, linkCredential } from "@/lib/credential";
import { FileConfig } from "@/lib/connectors/connectors";
import { useToast } from "@/hooks/use-toast";

export const submitFiles = async (
  selectedFiles: File[],
  setSelectedFiles: (files: File[]) => void,
  name: string,
  isPublic: boolean,
  groups?: number[]
) => {
  const { toast } = useToast();
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
    toast({
      title: "Error",
      description: `Unable to upload files - ${responseJson.detail}`,
      variant: "destructive",
    });
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
    toast({
      title: "Error",
      description: `Unable to create connector - ${connectorErrorMsg}`,
      variant: "destructive",
    });
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
    toast({
      title: "Error",
      description: `Error creating credential for CC Pair - ${errorMsg}`,
      variant: "destructive",
    });
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
    toast({
      title: "Error",
      description: `Unable to link connector to credential - ${credentialResponseJson.detail}`,
      variant: "destructive",
    });
    return false;
  }

  const runConnectorErrorMsg = await runConnector(connector.id, [0]);
  if (runConnectorErrorMsg) {
    toast({
      title: "Error",
      description: `Unable to run connector - ${runConnectorErrorMsg}`,
      variant: "destructive",
    });
    return false;
  }

  setSelectedFiles([]);
  toast({
    title: "Success",
    description: "Successfully uploaded files!",
    variant: "success",
  });
  return true;
};
