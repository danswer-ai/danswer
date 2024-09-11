"use client";

import { useRouter } from "next/navigation";
import { EnterpriseSettings } from "@/app/admin/settings/interfaces";
import { useContext, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { SubLabel, TextFormField } from "@/components/admin/connectors/Field";
import { ImageUpload } from "./ImageUpload";
import { Button } from "@/components/ui/button";
import Image from "next/image";

function getLogoSrc() {
  const timestamp = Date.now();
  return encodeURI(`/api/enterprise-settings/logo?u=${timestamp}`);
}

export function WhitelabelingForm() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const settings = useContext(SettingsContext);
  if (!settings) {
    return null;
  }
  const enterpriseSettings = settings.enterpriseSettings;

  async function updateEnterpriseSettings(newValues: EnterpriseSettings) {
    const response = await fetch("/api/admin/enterprise-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(enterpriseSettings || {}),
        ...newValues,
      }),
    });
    if (response.ok) {
      router.refresh();
    } else {
      const errorMsg = (await response.json()).detail;
      alert(`Failed to update settings. ${errorMsg}`);
    }
  }

  return (
    <div>
      <Formik
        initialValues={{
          application_name: enterpriseSettings?.application_name || null,
          application_description:
            enterpriseSettings?.application_description || null,
          use_custom_logo: enterpriseSettings?.use_custom_logo || false,
          custom_popup_header: enterpriseSettings?.custom_popup_header || "",
          custom_popup_content: enterpriseSettings?.custom_popup_content || "",
        }}
        validationSchema={Yup.object().shape({
          application_name: Yup.string().nullable(),
          application_description: Yup.string().nullable(),
          use_custom_logo: Yup.boolean().required(),
          custom_popup_header: Yup.string().nullable(),
          custom_popup_content: Yup.string().nullable(),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);

          if (selectedFile) {
            values.use_custom_logo = true;

            const formData = new FormData();
            formData.append("file", selectedFile);
            setSelectedFile(null);
            const response = await fetch(
              "/api/admin/enterprise-settings/logo",
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
          await updateEnterpriseSettings(values);
        }}
      >
        {({ isSubmitting, values, setValues }) => (
          <Form>
            <TextFormField
              label="Workspace Name"
              name="application_name"
              subtext={`The custom name you are giving for your workspace. This will replace 'enMedD AI' everywhere in the UI.`}
              placeholder="Custom name which will replace 'enMedD AI'"
              disabled={isSubmitting}
            />
            <TextFormField
              label="Description"
              name="application_description"
              subtext={`The custom description metadata you are giving ${
                values.application_name || "enMedD AI"
              } for your workspace.\
                This will be seen when sharing the link or searching through the browser.`}
              placeholder="Custom description for your Workspace"
              disabled={isSubmitting}
            />

            {values.use_custom_logo ? (
              <div className="pt-3 flex flex-col items-start gap-3">
                <div>
                  <h3 className="font-semibold">Custom Logo</h3>
                  <SubLabel>Current Custom Logo: </SubLabel>
                </div>
                <Image
                  /* src={"/api/enterprise-settings/logo?u=" + Date.now()} */
                  src={getLogoSrc()}
                  alt="Logo"
                  style={{ objectFit: "contain" }}
                  className="w-32 h-32"
                  width={128}
                  height={128}
                />

                <Button
                  variant="destructive"
                  type="button"
                  onClick={async () => {
                    const valuesWithoutLogo = {
                      ...values,
                      use_custom_logo: false,
                    };
                    await updateEnterpriseSettings(valuesWithoutLogo);
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
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
            />

            <div className="pt-8">
              <TextFormField
                label="Custom Popup Header"
                name="custom_popup_header"
                subtext={`The title for the popup that will be displayed for each user on their initial visit 
              to the application. If left blank AND Custom Popup Content is specified, will use "Welcome to ${
                values.application_name || "enMedD AI"
              }!".`}
                placeholder="Initial Popup Header"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <TextFormField
                label="Custom Popup Content"
                name="custom_popup_content"
                subtext={`Custom Markdown content that will be displayed as a popup on initial visit to the application.`}
                placeholder="Your popup content..."
                isTextArea
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit">Update</Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
