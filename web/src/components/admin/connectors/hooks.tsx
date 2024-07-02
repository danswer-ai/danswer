import { useState, useEffect } from "react";
import { getAdvancedSettings } from "@/lib/connector";

export const useConnectorAdvancedSettings = () => {
  const [displayAdvancedSettings, setDisplayAdvancedSettings] = useState(false);

  useEffect(() => {
    getAdvancedSettings().then((advancedSettings) => {
      setDisplayAdvancedSettings(advancedSettings.enabled);
    });
  }, []);

  return displayAdvancedSettings;
};
