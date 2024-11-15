import React, { Dispatch, FC, SetStateAction, useState } from "react";
import CredentialSubText, {
  AdminBooleanFormField,
} from "@/components/credentials/CredentialFields";
import { FileUpload } from "@/components/admin/connectors/FileUpload";
import {
  ConnectionConfiguration,
  Option,
  TabOption,
} from "@/lib/connectors/connectors";
import SelectInput from "./ConnectorInput/SelectInput";
import NumberInput from "./ConnectorInput/NumberInput";
import { SubLabel, TextFormField } from "@/components/admin/connectors/Field";
import ListInput from "./ConnectorInput/ListInput";
import FileInput from "./ConnectorInput/FileInput";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";
import { AccessTypeForm } from "@/components/admin/connectors/AccessTypeForm";
import { AccessTypeGroupSelector } from "@/components/admin/connectors/AccessTypeGroupSelector";
import { ConfigurableSources } from "@/lib/types";
import { Credential } from "@/lib/connectors/credentials";
import CollapsibleSection from "@/app/admin/assistants/CollapsibleSection";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs2";

interface TabsFieldProps {
  tabField: TabOption;
  values: any;
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  connector: ConfigurableSources;
  currentCredential: Credential<any> | null;
}

const TabsField: FC<TabsFieldProps> = ({
  tabField,
  values,
  selectedFiles,
  setSelectedFiles,
  connector,
  currentCredential,
}) => {
  return (
    <div className="w-full">
      {tabField.label && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {typeof tabField.label === "function"
              ? tabField.label(currentCredential)
              : tabField.label}
          </h3>
          {tabField.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {typeof tabField.description === "function"
                ? tabField.description(currentCredential)
                : tabField.description}
            </p>
          )}
        </div>
      )}

      <Tabs
        defaultValue={tabField.tabs[0].value}
        className="w-full"
        onValueChange={(newTab) => {
          // Clear values from other tabs but preserve defaults
          tabField.tabs.forEach((tab) => {
            if (tab.value !== newTab) {
              tab.fields.forEach((field) => {
                // Only clear if not default value
                if (values[field.name] !== field.default) {
                  values[field.name] = field.default;
                }
              });
            }
          });
        }}
      >
        <TabsList>
          {tabField.tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabField.tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="">
            {tab.fields.map((subField, index, array) => {
              // Check visibility condition first
              if (
                subField.visibleCondition &&
                !subField.visibleCondition(values, currentCredential)
              ) {
                return null;
              }

              return (
                <div
                  key={subField.name}
                  className={
                    index < array.length - 1 && subField.type !== "string_tab"
                      ? "mb-4"
                      : ""
                  }
                >
                  <RenderField
                    key={subField.name}
                    field={subField}
                    values={values}
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    connector={connector}
                    currentCredential={currentCredential}
                  />
                </div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

interface RenderFieldProps {
  field: any;
  values: any;
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  connector: ConfigurableSources;
  currentCredential: Credential<any> | null;
}

const RenderField: FC<RenderFieldProps> = ({
  field,
  values,
  selectedFiles,
  setSelectedFiles,
  connector,
  currentCredential,
}) => {
  const label =
    typeof field.label === "function"
      ? field.label(currentCredential)
      : field.label;
  const description =
    typeof field.description === "function"
      ? field.description(currentCredential)
      : field.description;

  if (field.type === "tab") {
    return (
      <TabsField
        tabField={field}
        values={values}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        connector={connector}
        currentCredential={currentCredential}
      />
    );
  }

  const fieldContent = (
    <>
      {field.type === "file" ? (
        <FileUpload
          name={field.name}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
        />
      ) : field.type === "zip" ? (
        <FileInput
          name={field.name}
          label={label}
          optional={field.optional}
          description={description}
        />
      ) : field.type === "list" ? (
        <ListInput name={field.name} label={label} description={description} />
      ) : field.type === "select" ? (
        <SelectInput
          name={field.name}
          optional={field.optional}
          description={description}
          options={field.options || []}
          label={label}
        />
      ) : field.type === "number" ? (
        <NumberInput
          label={label}
          optional={field.optional}
          description={description}
          name={field.name}
        />
      ) : field.type === "checkbox" ? (
        <AdminBooleanFormField
          checked={values[field.name]}
          subtext={description}
          name={field.name}
          label={label}
        />
      ) : field.type === "text" ? (
        <TextFormField
          subtext={description}
          optional={field.optional}
          type={field.type}
          label={label}
          name={field.name}
          isTextArea={field.isTextArea || false}
          defaultHeight={"h-15"}
        />
      ) : field.type === "string_tab" ? (
        <div className="text-center">{description}</div>
      ) : (
        <>"INVALID FIELD TYPE"</>
      )}
    </>
  );

  if (field.wrapInCollapsible) {
    return (
      <CollapsibleSection prompt={label} key={field.name}>
        {fieldContent}
      </CollapsibleSection>
    );
  }

  return <div key={field.name}>{fieldContent}</div>;
};

export interface DynamicConnectionFormProps {
  config: ConnectionConfiguration;
  selectedFiles: File[];
  setSelectedFiles: Dispatch<SetStateAction<File[]>>;
  values: any;
  connector: ConfigurableSources;
  currentCredential: Credential<any> | null;
}

const DynamicConnectionForm: FC<DynamicConnectionFormProps> = ({
  config,
  selectedFiles,
  setSelectedFiles,
  values,
  connector,
  currentCredential,
}) => {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const renderFields = (fields: any[]) => {
    return fields.map(
      (field) =>
        !field.hidden && (
          <RenderField
            key={field.name}
            field={field}
            values={values}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            connector={connector}
            currentCredential={currentCredential}
          />
        )
    );
  };

  return (
    <>
      {/* <h2 className="text-2xl font-bold text-text-800">{config.description}</h2> */}

      {config.subtext && (
        <CredentialSubText>{config.subtext}</CredentialSubText>
      )}

      <TextFormField
        subtext="A descriptive name for the connector."
        type={"text"}
        label={"Connector Name"}
        name={"name"}
      />

      {renderFields(config.values)}

      <AccessTypeForm connector={connector} />
      <AccessTypeGroupSelector connector={connector} />

      {config.advanced_values.length > 0 && (
        <>
          <AdvancedOptionsToggle
            showAdvancedOptions={showAdvancedOptions}
            setShowAdvancedOptions={setShowAdvancedOptions}
          />
          {showAdvancedOptions && renderFields(config.advanced_values)}
        </>
      )}
    </>
  );
};

export default DynamicConnectionForm;
