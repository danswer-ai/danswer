import { UpdateConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import {
  BooleanFormField,
  TextArrayFieldBuilder,
} from "@/components/admin/connectors/Field";
import { XIcon } from "@/components/icons/icons";
import { Connector, GoogleDriveConfig } from "@/lib/types";
import * as Yup from "yup";
import { googleDriveConnectorNameBuilder } from "./utils";
import { Modal } from "@/components/Modal";
import { Divider, Text } from "@tremor/react";

interface Props {
  existingConnector: Connector<GoogleDriveConfig>;
  onSubmit: () => void;
}

export const ConnectorEditPopup = ({ existingConnector, onSubmit }: Props) => {
  return (
    <Modal onOutsideClick={onSubmit}>
      <div className="bg-background">
        <h2 className="text-xl font-bold flex">
          Update Google Drive Connector
          <div
            onClick={onSubmit}
            className="ml-auto hover:bg-hover p-1.5 rounded"
          >
            <XIcon
              size={20}
              className="my-auto flex flex-shrink-0 cursor-pointer"
            />
          </div>
        </h2>

        <Text>
          Modify the selected Google Drive connector by adjusting the values
          below!
        </Text>

        <Divider />

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
              <BooleanFormField
                name="only_org_public"
                label="Only Include Org Public Files"
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
            only_org_public: Yup.boolean().required(),
          })}
          onSubmit={onSubmit}
        />
      </div>
    </Modal>
  );
};
