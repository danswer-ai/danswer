import {
  Connector,
  GithubConfig,
  GithubCredentialJson,
  Credential,
} from "@/lib/types";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { Popup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { TrashIcon } from "@/components/icons/icons";
import { deleteConnector } from "@/lib/connector";
import { AttachCredentialButtonForTable } from "@/components/admin/connectors/buttons/AttachCredentialButtonForTable";

interface Props {
  connectors: Connector<GithubConfig>[];
  liveCredential: Credential<GithubCredentialJson> | null;
  onDelete: () => void;
  onCredentialLink: (connectorId: number) => void;
}

export const GithubConnectorsTable = ({
  connectors,
  liveCredential,
  onDelete,
  onCredentialLink,
}: Props) => {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <BasicTable
        columns={[
          {
            header: "Repository",
            key: "repository",
          },
          {
            header: "Status",
            key: "status",
          },
          {
            header: "Credential",
            key: "credential",
          },
          // {
          //   header: "Force Index",
          //   key: "index",
          // },
          {
            header: "Remove",
            key: "remove",
          },
        ]}
        data={connectors
          .filter(
            (connector) =>
              connector.source === "github" &&
              connector.input_type === "load_state"
          )
          .map((connector) => {
            const hasValidCredentials =
              liveCredential &&
              connector.credential_ids.includes(liveCredential.id);
            return {
              credential: hasValidCredentials ? (
                liveCredential.credential_json.github_token
              ) : liveCredential ? (
                <AttachCredentialButtonForTable
                  onClick={() => onCredentialLink(connector.id)}
                />
              ) : (
                <p className="text-red-700">N/A</p>
              ),
              repository: `${connector.connector_specific_config.repo_owner}/${connector.connector_specific_config.repo_name}`,
              status: hasValidCredentials ? (
                <div className="text-emerald-600">Running!</div>
              ) : (
                <div className="text-red-700">Missing Credentials</div>
              ),
              remove: (
                <div
                  className="cursor-pointer mx-auto"
                  onClick={() => {
                    deleteConnector(connector.id).then(() => {
                      setPopup({
                        message: "Successfully deleted connector",
                        type: "success",
                      });
                      setTimeout(() => {
                        setPopup(null);
                      }, 3000);
                      onDelete();
                    });
                  }}
                >
                  <TrashIcon />
                </div>
              ),
            };
            // index: (
            //   <IndexButtonForTable
            //     onClick={async () => {
            //       const { message, isSuccess } = await submitIndexRequest(
            //         connector.source,
            //         connector.connector_specific_config
            //       );
            //       setPopup({
            //         message,
            //         type: isSuccess ? "success" : "error",
            //       });
            //       setTimeout(() => {
            //         setPopup(null);
            //       }, 3000);
            //       mutate("/api/admin/connector/index-attempt");
            //     }}
            //   />
            // ),
          })}
      />
    </>
  );
};
