import { TextFormField } from "@/components/admin/connectors/Field";
import { useFormikContext } from "formik";
import { ValidAutoSyncSources } from "@/lib/types";
import { Divider } from "@tremor/react";
import { autoSyncConfigBySource } from "@/lib/connectors/AutoSyncOptionFields";

export function AutoSyncOptions({
  connectorType,
}: {
  connectorType: ValidAutoSyncSources;
}) {
  return (
    <div>
      <Divider />
      <>
        {Object.entries(autoSyncConfigBySource[connectorType]).map(
          ([key, config]) => (
            <div key={key} className="mb-4">
              <TextFormField
                name={`auto_sync_options.${key}`}
                label={config.label}
                subtext={config.subtext}
              />
            </div>
          )
        )}
      </>
    </div>
  );
}
