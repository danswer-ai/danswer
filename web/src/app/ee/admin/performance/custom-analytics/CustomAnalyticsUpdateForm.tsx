"use client";

import { Label, SubLabel } from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Button, Text } from "@tremor/react";
import { useContext, useState } from "react";

export function CustomAnalyticsUpdateForm() {
  const settings = useContext(SettingsContext);
  if (!settings) {
    return null;
  }
  const customAnalyticsScript = settings.customAnalyticsScript;

  const [newCustomAnalyticsScript, setNewCustomAnalyticsScript] =
    useState<string>(customAnalyticsScript || "");
  const [secretKey, setSecretKey] = useState<string>("");

  const { popup, setPopup } = usePopup();

  return (
    <div>
      {popup}
      <div className="mb-4">
        <Label>Script</Label>
        <Text className="mb-3">
          Specify the Javascript that should run on page load in order to
          initialize your custom tracking/analytics.
        </Text>
        <Text className="mb-2">
          Do not include the{" "}
          <span className="font-mono">&lt;script&gt;&lt;/script&gt;</span> tags.
          If you upload a script below but you are not recieving any events in
          your analytics platform, try removing all extra whitespace before each
          line of JavaScript.
        </Text>
        <textarea
          className={`
          border 
          border-border 
          rounded 
          w-full 
          py-2 
          px-3 
          mt-1
          h-28`}
          value={newCustomAnalyticsScript}
          onChange={(e) => setNewCustomAnalyticsScript(e.target.value)}
        />
      </div>

      <Label>Secret Key</Label>
      <SubLabel>
        <>
          For security reasons, you must provide a secret key to update this
          script. This should be the value of the{" "}
          <i>CUSTOM_ANALYTICS_SECRET_KEY</i> environment variable set when
          initially setting up Danswer.
        </>
      </SubLabel>
      <input
        className={`
          border 
          border-border 
          rounded 
          w-full 
          py-2 
          px-3 
          mt-1`}
        type="password"
        value={secretKey}
        onChange={(e) => setSecretKey(e.target.value)}
      />

      <Button
        className="mt-4"
        onClick={async () => {
          const response = await fetch(
            "/api/admin/enterprise-settings/custom-analytics-script",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                script: newCustomAnalyticsScript,
                secret_key: secretKey,
              }),
            }
          );
          if (response.ok) {
            setPopup({
              type: "success",
              message: "Custom analytics script updated successfully!",
            });
          } else {
            const errorMsg = (await response.json()).detail;
            setPopup({
              type: "error",
              message: `Failed to update custom analytics script: "${errorMsg}"`,
            });
          }
          setSecretKey("");
        }}
      >
        Update
      </Button>
    </div>
  );
}
