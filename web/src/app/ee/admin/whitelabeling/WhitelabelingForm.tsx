"use client";

import { useRouter } from "next/navigation";
import { EnterpriseSettings } from "@/app/admin/settings/interfaces";
import { useContext, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProviderClientSideHelper";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import {
  Label,
  SubLabel,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Button } from "@tremor/react";
import { ImageUpload } from "./ImageUpload";

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
  console.log(enterpriseSettings);

  return (
    <div>
      <Formik
        initialValues={{
          application_name: enterpriseSettings?.application_name || null,
          use_custom_logo: enterpriseSettings?.use_custom_logo || false,
        }}
        validationSchema={Yup.object().shape({
          application_name: Yup.string(),
          use_custom_logo: Yup.boolean().required(),
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
              label="Application Name"
              name="application_name"
              subtext={`The custom name you are giving Danswer for your organization. This will replace 'Danswer' everywhere in the UI.`}
              placeholder="Custom name which will replace 'Danswer'"
              disabled={isSubmitting}
            />

            <Label>Custom Logo</Label>

            {values.use_custom_logo ? (
              <div className="mt-3">
                <SubLabel>Current Custom Logo: </SubLabel>
                <img
                  src={"/api/enterprise-settings/logo?u=" + Date.now()}
                  alt="logo"
                  style={{ objectFit: "contain" }}
                  className="w-32 h-32 mb-10 mt-4"
                />

                <Button
                  color="red"
                  size="xs"
                  type="button"
                  className="mb-8"
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

                <SubLabel>
                  Override the current custom logo by uploading a new image
                  below and clicking the Update button.
                </SubLabel>
              </div>
            ) : (
              <SubLabel>
                Specify your own logo to replace the standard Danswer logo.
              </SubLabel>
            )}

            <ImageUpload
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
            />

            <Button type="submit" className="mt-4">
              Update
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
