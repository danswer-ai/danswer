import { PopupSpec } from "@/components/admin/connectors/Popup";
import { createConnector, runConnector } from "@/lib/connector";
import { linkCredential } from "@/lib/credential";
import { GoogleSitesConfig } from "@/lib/types";
import { mutate } from "swr";

export const submitGoogleSite = async (
  selectedFiles: File[],
  base_url: any,
  setPopup: (popup: PopupSpec) => void
) => {
  const uploadCreateAndTriggerConnector = async () => {
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
      setPopup({
        message: `Unable to upload files - ${responseJson.detail}`,
        type: "error",
      });
      return;
    }

    const filePaths = responseJson.file_paths as string[];
    const [connectorErrorMsg, connector] =
      await createConnector<GoogleSitesConfig>({
        name: `GoogleSitesConnector-${base_url}`,
        source: "google_sites",
        input_type: "load_state",
        connector_specific_config: {
          base_url: base_url,
          zip_path: filePaths[0],
        },
        refresh_freq: null,
        prune_freq: 0,
        disabled: false,
      });
    if (connectorErrorMsg || !connector) {
      setPopup({
        message: `Unable to create connector - ${connectorErrorMsg}`,
        type: "error",
      });
      return;
    }

    const credentialResponse = await linkCredential(connector.id, 0, base_url);
    if (!credentialResponse.ok) {
      const credentialResponseJson = await credentialResponse.json();
      setPopup({
        message: `Unable to link connector to credential - ${credentialResponseJson.detail}`,
        type: "error",
      });
      return;
    }

    const runConnectorErrorMsg = await runConnector(connector.id, [0]);
    if (runConnectorErrorMsg) {
      setPopup({
        message: `Unable to run connector - ${runConnectorErrorMsg}`,
        type: "error",
      });
      return;
    }
    setPopup({
      type: "success",
      message: "Successfully uploaded files!",
    });
  };

  try {
    await uploadCreateAndTriggerConnector();
  } catch (e) {
    console.log("Failed to index filels: ", e);
  }
};
