import { TextFormField } from "@/components/admin/connectors/Field";
import { useFormikContext } from "formik";
import { ValidAutoSyncSources } from "@/lib/types";

// The first key is the connector type, and the second key is the field name
const autoSyncConfig = {
  google_drive: {
    customer_id: {
      label: "Google Workspace Customer ID",
      subtext: (
        <>
          The unique identifier for your Google Workspace account. To find this,
          checkout the{" "}
          <a
            href="https://support.google.com/cloudidentity/answer/10070793"
            target="_blank"
            className="text-link"
          >
            guide from Google
          </a>
          .
        </>
      ),
    },
    company_domain: {
      label: "Google Workspace Company Domain",
      subtext: (
        <>
          The email domain for your Google Workspace account.
          <br />
          <br />
          For example, if your email provided through Google Workspace looks
          something like chris@danswer.ai, then your company domain is{" "}
          <b>danswer.ai</b>
        </>
      ),
    },
  },
};

export function AutoSyncOptions({
  connectorType,
}: {
  connectorType: ValidAutoSyncSources;
}) {
  const { setFieldValue } = useFormikContext();

  const handleInputChange = (field: string, value: string) => {
    setFieldValue(`auto_sync_options.${field}`, value);
  };

  return (
    <div>
      {Object.entries(autoSyncConfig[connectorType]).map(([key, config]) => (
        <TextFormField
          key={key}
          name={`auto_sync_options.${key}`}
          label={config.label}
          subtext={config.subtext}
          onChange={(e) => handleInputChange(key, e.target.value)}
        />
      ))}
    </div>
  );
}
