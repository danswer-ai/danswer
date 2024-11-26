import React, { Dispatch, FC, SetStateAction } from "react";
import CredentialSubText, {
  AdminBooleanFormField,
} from "@/components/credentials/CredentialFields";
import { FileUpload } from "@/components/admin/connectors/FileUpload";
import { ConnectionConfiguration } from "@/lib/connectors/connectors";
import NumberInput from "./ConnectorInput/NumberInput";
import {
  BooleanFormField,
  SelectorFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import ListInput from "./ConnectorInput/ListInput";
import FileInput from "./ConnectorInput/FileInput";

export interface DynamicConnectionFormProps {
  config: ConnectionConfiguration;
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  values: any;
}

const DynamicConnectionForm: FC<DynamicConnectionFormProps> = ({
  config,
  selectedFiles,
  setSelectedFiles,
  values,
}) => {
  return (
    <>
      <h2 className="pb-4 text-2xl font-bold text-text-800 overflow-y-auto">
        {config.description}
      </h2>

      {config.subtext && (
        <CredentialSubText>{config.subtext}</CredentialSubText>
      )}

      <TextFormField
        subtext="A descriptive name for the data source. This will be used to identify the data source in the Admin UI."
        type={"text"}
        label={"Data Source Name"}
        name={"name"}
      />

      {config.values.map((field) => {
        if (!field.hidden) {
          return (
            <div key={field.name}>
              {field.type == "file" ? (
                <FileUpload
                  name={field.name}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                />
              ) : field.type == "zip" ? (
                <FileInput
                  name={field.name}
                  label={field.label}
                  optional={field.optional}
                  description={field.description}
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                />
              ) : field.type === "list" ? (
                <ListInput field={field} />
              ) : field.type === "select" ? (
                <SelectorFormField
                  name={field.name}
                  optional={field.optional}
                  subtext={field.description}
                  options={field.options || []}
                  label={field.label}
                />
              ) : field.type === "number" ? (
                <NumberInput
                  label={field.label}
                  optional={field.optional}
                  description={field.description}
                  name={field.name}
                />
              ) : field.type === "checkbox" ? (
                // <AdminBooleanFormField
                //   checked={values[field.name]}
                //   subtext={field.description}
                //   name={field.name}
                //   label={field.label}
                // />
                <BooleanFormField
                  name={field.name}
                  label={field.label}
                  subtext={field.description}
                  alignTop
                />
              ) : (
                <TextFormField
                  subtext={field.description}
                  optional={field.optional}
                  type={field.type}
                  label={field.label}
                  name={field.name}
                />
              )}
            </div>
          );
        }
      })}
    </>
  );
};

export default DynamicConnectionForm;
