"use client";

import { SubLabel } from "@/components/admin/connectors/Field";
import { useRouter } from "next/navigation";
import { Option } from "@/components/Dropdown";
import { useContext } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import React, { useState, useEffect } from "react";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label as ShadcnLabel } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "../interfaces";

function CheckboxComponent({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex text-sm mb-4 gap-3">
      <Checkbox checked={checked} onCheckedChange={onChange} id={label} />
      <div className="grid leading-none">
        <ShadcnLabel
          htmlFor={label}
          className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </ShadcnLabel>
        <p className="text-sm text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

function Selector({
  label,
  subtext,
  options,
  selected,
  onSelect,
}: {
  label: string;
  subtext: string;
  options: Option<string>[];
  selected: string;
  onSelect: (value: string | number | null) => void;
}) {
  return (
    <div className="mb-8">
      <div className="grid gap-1 pb-1.5">
        {label && (
          <ShadcnLabel
            htmlFor={label}
            className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </ShadcnLabel>
        )}
        {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
      </div>

      <div className="w-full max-w-96">
        <Select value={selected} onValueChange={onSelect}>
          <SelectTrigger className="flex text-sm bg-background px-3 py-1.5 rounded-regular border border-border cursor-pointer">
            <SelectValue
              placeholder={selected ? undefined : "Select an option..."}
            />
          </SelectTrigger>
          <SelectContent className="border rounded-regular flex flex-col bg-background max-h-96 overflow-y-auto overscroll-contain">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function IntegerInput({
  label,
  sublabel,
  value,
  onChange,
  id,
  placeholder = "Enter a number",
}: {
  label: string;
  sublabel: string;
  value: number | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col text-sm mb-4">
      <div className="grid gap-1 pb-1.5">
        <ShadcnLabel
          htmlFor={label}
          className="font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </ShadcnLabel>
        <SubLabel>{sublabel}</SubLabel>
      </div>
      <Input
        type="number"
        className="w-full max-w-xs"
        value={value ?? ""}
        onChange={onChange}
        min="1"
        step="1"
        id={id}
        placeholder={placeholder}
      />
    </label>
  );
}

export function Configuration() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [chatRetention, setChatRetention] = useState("");
  const isEnterpriseEnabled = usePaidEnterpriseFeaturesEnabled();
  const { toast } = useToast();

  const combinedSettings = useContext(SettingsContext);

  useEffect(() => {
    if (combinedSettings) {
      setSettings(combinedSettings.settings);
      setChatRetention(
        combinedSettings.settings.maximum_chat_retention_days?.toString() || ""
      );
    }
  }, []);

  if (!settings) {
    return null;
  }

  async function updateSettingField(
    updateRequests: { fieldName: keyof Settings; newValue: any }[]
  ) {
    // Optimistically update the local state
    const newSettings: Settings | null = settings
      ? {
          ...settings,
          ...updateRequests.reduce((acc, { fieldName, newValue }) => {
            acc[fieldName] = newValue ?? settings[fieldName];
            return acc;
          }, {} as Partial<Settings>),
        }
      : null;
    setSettings(newSettings);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const errorMsg = (await response.json()).detail;
        throw new Error(errorMsg);
      }

      router.refresh();
      toast({
        title: "Settings Updated",
        description: "Your settings have been successfully updated!",
        variant: "success",
      });
    } catch (error) {
      // Revert the optimistic update
      setSettings(settings);
      console.error("Error updating settings:", error);
      toast({
        title: "Update Failed",
        description: `Unable to update settings. Reason: ${error}`,
        variant: "destructive",
      });
    }
  }

  function handleToggleSettingsField(
    fieldName: keyof Settings,
    checked: boolean
  ) {
    const updates: { fieldName: keyof Settings; newValue: any }[] = [
      { fieldName, newValue: checked },
    ];

    if (
      !checked &&
      (fieldName === "search_page_enabled" || fieldName === "chat_page_enabled")
    ) {
      const otherPageField =
        fieldName === "search_page_enabled"
          ? "chat_page_enabled"
          : "search_page_enabled";
      const otherPageEnabled = settings && settings[otherPageField];

      if (
        otherPageEnabled &&
        settings?.default_page ===
          (fieldName === "search_page_enabled" ? "search" : "chat")
      ) {
        updates.push({
          fieldName: "default_page",
          newValue: fieldName === "search_page_enabled" ? "chat" : "search",
        });
      }
    }

    updateSettingField(updates);
  }

  function handleSetChatRetention() {
    const newValue = chatRetention === "" ? null : parseInt(chatRetention, 10);
    updateSettingField([
      { fieldName: "maximum_chat_retention_days", newValue },
    ]);
  }

  function handleClearChatRetention() {
    setChatRetention("");
    updateSettingField([
      { fieldName: "maximum_chat_retention_days", newValue: null },
    ]);
  }

  return (
    <div className="pt-8">
      <div>
        <h2 className="font-bold text:lg md:text-xl">Page and Chat Setup</h2>
        <p className="text-sm">
          Manage general Arnold AI settings applicable to all users in the
          workspace.
        </p>
      </div>

      <h3 className="mb-4 pt-8">Page Visibility</h3>

      <CheckboxComponent
        label="Chat Page Enabled?"
        sublabel="If set, then the 'Chat' page will be accessible to all users and will show up as an option on the top navbar. If unset, then this page will not be available."
        checked={settings.chat_page_enabled}
        onChange={(checked) =>
          handleToggleSettingsField("chat_page_enabled", checked)
        }
      />

      <CheckboxComponent
        label="Search Page Enabled?"
        sublabel="If set, then the 'Search' page will be accessible to all users and will show up as an option on the top navbar. If unset, then this page will not be available."
        checked={settings.search_page_enabled}
        onChange={(checked) =>
          handleToggleSettingsField("search_page_enabled", checked)
        }
      />

      <Selector
        label="Default Page"
        subtext="The page that users will be redirected to after logging in. Can only be set to a page that is enabled."
        options={[
          { value: "search", name: "Search" },
          { value: "chat", name: "Chat" },
        ]}
        selected={settings.default_page}
        onSelect={(value) => {
          value &&
            updateSettingField([
              { fieldName: "default_page", newValue: value },
            ]);
        }}
      />

      {isEnterpriseEnabled && (
        <>
          <h3 className="mb-4">Chat Settings</h3>
          <IntegerInput
            label="Chat Retention"
            sublabel="Enter the maximum number of days you would like Arnold AI to retain chat messages. Leaving this field empty will cause Arnold AI to never delete chat messages."
            value={chatRetention === "" ? null : Number(chatRetention)}
            onChange={(e) => {
              const numValue = parseInt(e.target.value, 10);
              if (numValue >= 1 || e.target.value === "") {
                setChatRetention(e.target.value);
              }
            }}
            id="chatRetentionInput"
            placeholder="Infinite Retention"
          />
          <div className="flex gap-2">
            <Button onClick={handleClearChatRetention} variant="outline">
              Retain All
            </Button>
            <Button onClick={handleSetChatRetention}>
              Set Retention Limit
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
