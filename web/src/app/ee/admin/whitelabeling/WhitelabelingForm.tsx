"use client";

import { useRouter } from "next/navigation";
import { Workspaces } from "@/app/admin/settings/interfaces";
import { useContext, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import {
  BooleanFormField,
  SubLabel,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { ImageUpload } from "./ImageUpload";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";
import { Text } from "@tremor/react";
import { useToast } from "@/hooks/use-toast";

export function WhitelabelingForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [selectedLogotype, setSelectedLogotype] = useState<File | null>(null);

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const settings = useContext(SettingsContext);
  if (!settings) {
    return null;
  }
  const workspaces = settings.workspaces;

  async function updateWorkspaces(newValues: Workspaces) {
    const response = await fetch("/api/admin/workspace", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(workspaces || {}),
        ...newValues,
      }),
    });
    if (response.ok) {
      router.refresh();
      toast({
        title: "Settings updated",
        description: "The workspace settings have been successfully updated.",
        variant: "success",
      });
    } else {
      const errorMsg = (await response.json()).detail;
      toast({
        title: "Failed to update settings.",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }

  return (
    <div>
      <Formik
        initialValues={{
          workspace_name: workspaces?.workspace_name || null,
          workspace_description: workspaces?.workspace_description || null,
          use_custom_logo: workspaces?.use_custom_logo || false,
          use_custom_logotype: workspaces?.use_custom_logotype || false,
          custom_header_logo: workspaces?.custom_header_logo || "",
          custom_header_content: workspaces?.custom_header_content || "",
          two_lines_for_chat_header:
            workspaces?.two_lines_for_chat_header || false,
          custom_popup_header: workspaces?.custom_popup_header || "",
          custom_popup_content: workspaces?.custom_popup_content || "",
          custom_lower_disclaimer_content:
            workspaces?.custom_lower_disclaimer_content || "",
          custom_nav_items: workspaces?.custom_nav_items || [],
          enable_consent_screen: workspaces?.enable_consent_screen || false,
        }}
        validationSchema={Yup.object().shape({
          workspace_name: Yup.string().nullable(),
          workspace_description: Yup.string().nullable(),
          use_custom_logo: Yup.boolean().required(),
          custom_header_logo: Yup.string().nullable(),
          use_custom_logotype: Yup.boolean().required(),
          custom_header_content: Yup.string().nullable(),
          two_lines_for_chat_header: Yup.boolean().nullable(),
          custom_popup_header: Yup.string().nullable(),
          custom_popup_content: Yup.string().nullable(),
          custom_lower_disclaimer_content: Yup.string().nullable(),
          enable_consent_screen: Yup.boolean().nullable(),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);

          if (selectedLogo) {
            values.use_custom_logo = true;

            const formData = new FormData();
            formData.append("file", selectedLogo);
            setSelectedLogo(null);
            const response = await fetch("/api/admin/workspace/logo", {
              method: "PUT",
              body: formData,
            });
            if (!response.ok) {
              const errorMsg = (await response.json()).detail;
              toast({
                title: "Failed to upload logo",
                description: `Error: ${errorMsg}`,
                variant: "destructive",
              });
              formikHelpers.setSubmitting(false);
              return;
            }
          }

          if (selectedLogotype) {
            values.use_custom_logotype = true;

            const formData = new FormData();
            formData.append("file", selectedLogotype);
            setSelectedLogotype(null);
            const response = await fetch(
              "/api/admin/workspace/logo?is_logotype=true",
              {
                method: "PUT",
                body: formData,
              }
            );
            if (!response.ok) {
              const errorMsg = (await response.json()).detail;
              alert(`Failed to upload logo. ${errorMsg}`);
              formikHelpers.setSubmitting(false);
              return;
            }
          }

          formikHelpers.setValues(values);
          await updateWorkspaces(values);

          toast({
            title: "Logo uploaded",
            description: "The logo has been successfully uploaded.",
            variant: "success",
          });
        }}
      >
        {({ isSubmitting, values, setValues }) => (
          <Form>
            <TextFormField
              label="Workspace Name"
              name="workspace_name"
              subtext={`The custom name you are giving for your workspace. This will replace 'enMedD AI' everywhere in the UI.`}
              placeholder="Custom name which will replace 'enMedD AI'"
              disabled={isSubmitting}
            />

            <div className="pt-2" />

            <TextFormField
              optional
              label="Description"
              name="workspace_description"
              subtext={`The custom description metadata you are giving ${
                values.workspace_name || "enMedD AI"
              } for your workspace.\
                This will be seen when sharing the link or searching through the browser.`}
              placeholder="Custom description for your Workspace"
              disabled={isSubmitting}
            />

            <div className="pt-2" />

            {values.use_custom_logo ? (
              <div className="pt-3 flex flex-col items-start gap-3">
                <div>
                  <h3>Custom Logo</h3>
                  <SubLabel>Current Custom Logo: </SubLabel>
                </div>
                <img
                  src={"/api/workspace/logo?u=" + Date.now()}
                  alt="Logo"
                  style={{ objectFit: "contain" }}
                  className="w-32 h-32"
                />

                <Button
                  variant="destructive"
                  type="button"
                  onClick={async () => {
                    const valuesWithoutLogo = {
                      ...values,
                      use_custom_logo: false,
                    };
                    await updateWorkspaces(valuesWithoutLogo);
                    setValues(valuesWithoutLogo);
                  }}
                >
                  Delete
                </Button>

                <p className="text-sm text-subtle pt-4 pb-2">
                  Override the current custom logo by uploading a new image
                  below and clicking the Update button.
                </p>
              </div>
            ) : (
              <p className="pb-3 text-sm text-subtle">
                Specify your own logo to replace the standard enMedD AI logo.
              </p>
            )}

            <ImageUpload
              selectedFile={selectedLogo}
              setSelectedFile={setSelectedLogo}
            />

            <div className="pt-2" />

            {/* TODO: polish the features here*/}
            {/* <AdvancedOptionsToggle
              showAdvancedOptions={showAdvancedOptions}
              setShowAdvancedOptions={setShowAdvancedOptions}
            />

            {showAdvancedOptions && (
              <div className="w-full flex flex-col gap-y-4">
                <Text>
                  Read{" "}
                  <Link
                    href={"https://docs.danswer.dev/enterprise_edition/theming"}
                    className="text-link cursor-pointer"
                  >
                    the docs
                  </Link>{" "}
                  to see whitelabelling examples in action.
                </Text>

                <TextFormField
                  label="Chat Header Content"
                  name="custom_header_content"
                  subtext={`Custom Markdown content that will be displayed as a banner at the top of the Chat page.`}
                  placeholder="Your header content..."
                  disabled={isSubmitting}
                />

                <BooleanFormField
                  name="two_lines_for_chat_header"
                  label="Two lines for chat header?"
                  subtext="If enabled, the chat header will be displayed on two lines instead of one."
                />

                <div className="pt-2" />

                <TextFormField
                  label={
                    values.enable_consent_screen
                      ? "Consent Screen Header"
                      : "Popup Header"
                  }
                  name="custom_popup_header"
                  subtext={
                    values.enable_consent_screen
                      ? `The title for the consent screen that will be displayed for each user on their initial visit to the application. If left blank, title will default to "Terms of Use".`
                      : `The title for the popup that will be displayed for each user on their initial visit to the application. If left blank AND Custom Popup Content is specified, will use "Welcome to ${values.workspace_name || "enMedD AI"}!".`
                  }
                  placeholder={
                    values.enable_consent_screen
                      ? "Consent Screen Header"
                      : "Initial Popup Header"
                  }
                  disabled={isSubmitting}
                />

                <TextFormField
                  label={
                    values.enable_consent_screen
                      ? "Consent Screen Content"
                      : "Popup Content"
                  }
                  name="custom_popup_content"
                  subtext={
                    values.enable_consent_screen
                      ? `Custom Markdown content that will be displayed as a consent screen on initial visit to the application. If left blank, will default to "By clicking 'I Agree', you acknowledge that you agree to the terms of use of this application and consent to proceed."`
                      : `Custom Markdown content that will be displayed as a popup on initial visit to the application.`
                  }
                  placeholder={
                    values.enable_consent_screen
                      ? "Your consent screen content..."
                      : "Your popup content..."
                  }
                  isTextArea
                  disabled={isSubmitting}
                />

                <BooleanFormField
                  name="enable_consent_screen"
                  label="Enable Consent Screen"
                  subtext="If enabled, the initial popup will be transformed into a consent screen. Users will be required to agree to the terms before accessing the application on their first login."
                  disabled={isSubmitting}
                />

                <TextFormField
                  label="Chat Footer Text"
                  name="custom_lower_disclaimer_content"
                  subtext={`Custom Markdown content that will be displayed at the bottom of the Chat page.`}
                  placeholder="Your disclaimer content..."
                  isTextArea
                  disabled={isSubmitting}
                />

                <div>
                  <h3>Chat Footer Logotype</h3>

                  {values.use_custom_logotype ? (
                    <div className="mt-3">
                      <SubLabel>Current Custom Logotype: </SubLabel>
                      <Image
                        src={
                          "/api/workspace/logotype?u=" + Date.now()
                        }
                        alt="logotype"
                        style={{ objectFit: "contain" }}
                        className="w-32 h-32 mb-10 mt-4"
                      />

                      <Button
                        color="red"
                        size="xs"
                        type="button"
                        className="mb-8"
                        onClick={async () => {
                          const valuesWithoutLogotype = {
                            ...values,
                            use_custom_logotype: false,
                          };
                          await updateWorkspaces(valuesWithoutLogotype);
                          setValues(valuesWithoutLogotype);
                        }}
                      >
                        Delete
                      </Button>

                      <SubLabel>
                        Override your uploaded custom logotype by uploading a
                        new image below and clicking the Update button. This
                        logotype is the text-based logo that will be rendered at
                        the bottom right of the chat screen.
                      </SubLabel>
                    </div>
                  ) : (
                    <SubLabel>
                      Add a custom logotype by uploading a new image below and
                      clicking the Update button. This logotype is the
                      text-based logo that will be rendered at the bottom right
                      of the chat screen.
                    </SubLabel>
                  )}
                  <ImageUpload
                    selectedFile={selectedLogotype}
                    setSelectedFile={setSelectedLogotype}
                  />
                </div>
              </div>
            )} */}

            <Button type="submit" className="mt-6">
              Update
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
