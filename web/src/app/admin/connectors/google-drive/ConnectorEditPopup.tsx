import { UpdateConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import {
  BooleanFormField,
  TextArrayFieldBuilder,
} from "@/components/admin/connectors/Field";
import { XIcon } from "@/components/icons/icons";
import { Connector, GoogleDriveConfig } from "@/lib/types";
import * as Yup from "yup";
import { googleDriveConnectorNameBuilder } from "./utils";

interface Props {
  existingConnector: Connector<GoogleDriveConfig>;
  onSubmit: () => void;
}

export const ConnectorEditPopup = ({ existingConnector, onSubmit }: Props) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onSubmit}
    >
      <div
        className="bg-gray-800 p-6 rounded border border-gray-700 shadow-lg relative w-1/2 text-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex border-b border-gray-600 pb-2 mb-2">
          <h3 className="text-lg font-semibold w-full">
            Update Google Drive Connector
          </h3>
          <div onClick={onSubmit}>
            <XIcon
              size={30}
              className="my-auto flex flex-shrink-0 cursor-pointer hover:text-blue-400"
            />
          </div>
        </div>
        <UpdateConnectorForm<GoogleDriveConfig>
          nameBuilder={googleDriveConnectorNameBuilder}
          existingConnector={existingConnector}
          formBodyBuilder={(values) => (
            <div>
              {TextArrayFieldBuilder({
                name: "folder_paths",
                label: "Folder Paths",
              })(values)}
              <BooleanFormField
                name="include_shared"
                label="Include Shared Files"
              />
              <BooleanFormField
                name="follow_shortcuts"
                label="Follow Shortcuts"
              />
            </div>
          )}
          validationSchema={Yup.object().shape({
            folder_paths: Yup.array()
              .of(
                Yup.string().required(
                  "Please specify a folder path for your google drive e.g. 'Engineering/Materials'"
                )
              )
              .required(),
            include_shared: Yup.boolean().required(),
            follow_shortcuts: Yup.boolean().required(),
          })}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
};
