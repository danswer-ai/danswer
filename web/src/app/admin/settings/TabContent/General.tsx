"use client";

import { useRouter } from "next/navigation";
import { Workspaces } from "@/app/admin/settings/interfaces";
import { useContext, useEffect, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { SubLabel, TextFormField } from "@/components/admin/connectors/Field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "../ImageUpload";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import getPalette from "tailwindcss-palette-generator";
import { HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { buildImgUrl } from "@/app/chat/files/images/utils";
import Image from "next/image";

export default function General() {
  const settings = useContext(SettingsContext);
  if (!settings) {
    return null;
  }
  const workspaces = settings.workspaces;

  const { toast } = useToast();
  const router = useRouter();
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [selectedHeaderLogo, setSelectedHeaderLogo] = useState<File | null>(
    null
  );
  const [selectedLogotype, setSelectedLogotype] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    smtp_server: settings.settings.smtp_server,
    smtp_port: settings.settings.smtp_port,
    smtp_username: settings.settings.smtp_username,
    smtp_password: settings.settings.smtp_password,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#65007E");
  const [secondaryColor, setSecondaryColor] = useState("#EEB3FE");

  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const response = await fetch("/api/themes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const themes = await response.json();

        setPrimaryColor(themes.brand["500"]);
        setSecondaryColor(themes.secondary["500"]);
      } catch (error) {
        console.error("Error fetching themes:", error);
      }
    };

    fetchThemes();
  }, []);

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

  async function updateSmtpSettings(workspaceId: number, smtpSettings: any) {
    setLoading(true);
    const response = await fetch(
      `/api/admin/settings/workspace/${workspaceId}/smtp`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smtpSettings),
      }
    );

    setLoading(false);
    if (response.ok) {
      toast({
        title: "SMTP Settings Updated",
        description: "The SMTP settings have been successfully updated.",
        variant: "success",
      });
    } else {
      const errorMsg = (await response.json()).detail;
      toast({
        title: "Failed to update SMTP settings.",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }

  async function updateWorkspaceTheme(
    workspaceId: number,
    brandColor: string,
    secondaryColor: string
  ) {
    const palette = getPalette([
      {
        color: brandColor,
        name: "primary",
        shade: 500,
        shades: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
      },
      {
        color: secondaryColor,
        name: "secondary",
        shade: 500,
        shades: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
      },
    ]);

    const themeData = {
      brand: palette.primary,
      secondary: palette.secondary,
    };

    const response = await fetch(
      `/api/admin/settings/themes?workspace_id=${workspaceId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(themeData),
      }
    );

    if (response.ok) {
      router.refresh();
    } else {
      const error = await response.json();
      console.error("Failed to update theme:", error.detail);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: name === "smtp_port" ? parseInt(value, 10) : value,
    }));
  };

  async function deleteLogo() {
    try {
      const response = await fetch("/api/admin/workspace/logo", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast({
          title: "Workspace Logo Deleted",
          description: "The workspace logo has been successfully removed.",
          variant: "success",
        });
        window.location.reload();
      } else {
        const errorMsg = (await response.json()).detail;
        toast({
          title: "Failed to delete workspace logo",
          description: `Error: ${errorMsg}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while deleting the workspace logo.",
        variant: "destructive",
      });
    }
  }

  async function deleteHeaderLogo() {
    try {
      const response = await fetch("/api/admin/workspace/header-logo", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast({
          title: "Header Logo Deleted",
          description: "The header logo has been successfully removed.",
          variant: "success",
        });
        window.location.reload();
      } else {
        const errorMsg = (await response.json()).detail;
        toast({
          title: "Failed to delete header logo",
          description: `Error: ${errorMsg}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while deleting the header logo.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="pt-6">
      <Formik
        initialValues={{
          workspace_name: workspaces?.workspace_name || null,
          workspace_description: workspaces?.workspace_description || null,
          use_custom_logo: workspaces?.use_custom_logo || false,
          use_custom_logotype: workspaces?.use_custom_logotype || false,
          custom_logo: workspaces?.custom_logo || null,
          custom_header_logo: workspaces?.custom_header_logo || null,
          custom_header_content: workspaces?.custom_header_content || "",
          two_lines_for_chat_header:
            workspaces?.two_lines_for_chat_header || false,
          custom_popup_header: workspaces?.custom_popup_header || "",
          custom_popup_content: workspaces?.custom_popup_content || "",
          custom_lower_disclaimer_content:
            workspaces?.custom_lower_disclaimer_content || "",
          custom_nav_items: workspaces?.custom_nav_items || [],
          enable_consent_screen: workspaces?.enable_consent_screen || false,
          brand_color: workspaces?.brand_color || "",
          secondary_color: workspaces?.secondary_color || "",
        }}
        validationSchema={Yup.object().shape({
          workspace_name: Yup.string().nullable(),
          workspace_description: Yup.string().nullable(),
          use_custom_logo: Yup.boolean().required(),
          custom_logo: Yup.string().nullable(),
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

          if (selectedHeaderLogo) {
            const formData = new FormData();
            formData.append("file", selectedHeaderLogo);
            setSelectedHeaderLogo(null);

            const response = await fetch("/api/admin/workspace/header-logo", {
              method: "PUT",
              body: formData,
            });

            if (!response.ok) {
              const errorMsg = (await response.json()).detail;
              toast({
                title: "Failed to upload header logo",
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

            const headerLogoResponse = await fetch(
              "/api/admin/workspace/header-logo",
              {
                method: "PUT",
                body: formData,
              }
            );

            if (!headerLogoResponse.ok) {
              const errorMsg = (await headerLogoResponse.json()).detail;
              toast({
                title: "Failed to upload header logo after logotype",
                description: `Error: ${errorMsg}`,
                variant: "destructive",
              });
              formikHelpers.setSubmitting(false);
              return;
            }
          }

          if (
            values.brand_color !== workspaces?.brand_color ||
            values.secondary_color !== workspaces?.secondary_color
          ) {
            await updateWorkspaceTheme(
              0,
              values.brand_color,
              values.secondary_color
            );
          }

          formikHelpers.setValues(values);
          await updateWorkspaces(values);
          window.location.reload();
        }}
      >
        {({ isSubmitting, values, setValues, setFieldValue }) => (
          <Form>
            <div className="py-8 ">
              <div className="flex gap-5 flex-col md:flex-row">
                <div className="grid leading-none md:w-96 lg:w-60 xl:w-[500px] shrink-0">
                  <Label
                    htmlFor="workspace_name"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed pb-1.5"
                  >
                    Workspace Name
                  </Label>
                  <p className="text-sm text-muted-foreground pb-1.5 md:w-4/5">
                    The custom name you are giving for your workspace. This will
                    replace &#39;Arnold AI&#39; everywhere in the UI.
                  </p>
                </div>

                <div className="md:w-[500px]">
                  <Input
                    name="workspace_name"
                    value={values.workspace_name || ""}
                    onChange={(e) =>
                      setFieldValue("workspace_name", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="py-8 ">
              <div className="flex gap-5 flex-col md:flex-row">
                <div className="grid leading-none md:w-96 lg:w-60 xl:w-[500px] shrink-0">
                  <Label
                    htmlFor="workspace_description"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed pb-1.5"
                  >
                    Description
                  </Label>
                  <p className="text-sm text-muted-foreground pb-1.5 md:w-4/5">
                    {`The custom description metadata you are giving ${
                      values.workspace_name || "Arnold AI"
                    } for your workspace.\
                  This will be seen when sharing the link or searching through the browser.`}
                  </p>
                </div>

                <div className="md:w-[500px]">
                  <Input
                    name="workspace_description"
                    placeholder="Custom description for your Workspace"
                    value={values.workspace_description || ""}
                    onChange={(e) =>
                      setFieldValue("workspace_description", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="py-8 ">
              <div className="flex gap-5 flex-col md:flex-row">
                <div className="leading-none md:w-96 lg:w-60 xl:w-[500px] shrink-0">
                  <Label
                    htmlFor="custom_logo"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed pb-1.5"
                  >
                    Logo
                  </Label>
                  <p className="text-sm text-muted-foreground pb-1.5 md:w-4/5">
                    Specify your own logo to replace the standard Arnold AI
                    logo.
                  </p>
                </div>

                <div className="md:w-[500px] flex flex-col gap-4">
                  <ImageUpload
                    selectedFile={selectedLogo}
                    setSelectedFile={setSelectedLogo}
                  />
                  {!selectedLogo && (
                    <div className="space-y-2">
                      <SubLabel>Current Logo:</SubLabel>
                      {workspaces?.custom_logo ? (
                        <>
                          <img
                            // src={"/api/workspace/logo?workspace_id=" + 0}
                            src={buildImgUrl(workspaces?.custom_logo)}
                            alt="Logo"
                            className="h-40 object-contain w-40"
                          />
                          <Button
                            variant="destructive"
                            type="button"
                            onClick={deleteLogo}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <Image
                          src="/arnold_ai.png"
                          alt="Logo"
                          width={160}
                          height={160}
                          className="h-40 object-contain w-40"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="py-8 ">
              <div className="flex gap-5 flex-col md:flex-row">
                <div className="leading-none md:w-96 lg:w-60 xl:w-[500px] shrink-0">
                  <Label
                    htmlFor="custom_header_logo"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed pb-1.5"
                  >
                    Header Logo
                  </Label>
                  <p className="text-sm text-muted-foreground pb-1.5 md:w-4/5">
                    Specify your own header logo to replace the standard Arnold
                    AI header logo.
                  </p>
                </div>

                <div className="md:w-[500px] flex flex-col gap-4">
                  <ImageUpload
                    selectedFile={selectedHeaderLogo}
                    setSelectedFile={setSelectedHeaderLogo}
                  />
                  {!selectedHeaderLogo && (
                    <div className="space-y-2">
                      <SubLabel>Current Header Logo:</SubLabel>
                      {workspaces?.custom_header_logo ? (
                        <>
                          <img
                            src={buildImgUrl(workspaces?.custom_header_logo)}
                            alt="Logo"
                            className="h-40 object-contain w-40"
                          />
                          <Button
                            variant="destructive"
                            type="button"
                            onClick={deleteHeaderLogo}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <Image
                          src="/arnold_ai.png"
                          alt="Logo"
                          width={160}
                          height={160}
                          className="h-40 object-contain w-40"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-8">
              <div className="flex gap-5 flex-col md:flex-row">
                <div className="leading-none md:w-96 lg:w-60 xl:w-[500px] shrink-0">
                  <Label
                    htmlFor="workspace_description"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed pb-1.5"
                  >
                    Brand Theme
                  </Label>
                  <p className="text-sm text-muted-foreground pb-1.5 md:w-4/5">
                    Select your customized brand color.
                  </p>
                </div>

                <div className="md:w-[500px] space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-subtle w-32">
                      Primary color:
                    </span>
                    <div className="flex gap-2">
                      {/* <Input
                        name="brand_color"
                        className="w-32"
                        value={values.brand_color || primaryColor}
                        onChange={(e) => {
                          setFieldValue("brand_color", e.target.value);
                          setPrimaryColor(e.target.value);
                        }}
                        required
                      /> */}
                      <Input
                        name="brand_color"
                        className="w-32"
                        value={values.brand_color}
                        onChange={(e) => {
                          setFieldValue("brand_color", e.target.value);
                          setPrimaryColor(e.target.value);
                        }}
                        required
                      />

                      <Popover>
                        <PopoverTrigger asChild>
                          <div
                            className="w-10 h-10 rounded-full outline-1 outline border-white border-2 cursor-pointer shrink-0"
                            style={{
                              backgroundColor: primaryColor,
                              outlineColor: primaryColor,
                            }}
                          />
                        </PopoverTrigger>
                        <PopoverContent>
                          <HexColorPicker
                            color={primaryColor}
                            onChange={(color) => {
                              setPrimaryColor(color);
                              setFieldValue("brand_color", color);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-subtle w-32">
                      Secondary color:
                    </span>
                    <div className="flex gap-2">
                      {/* <Input
                        name="secondary_color"
                        className="w-32"
                        value={values.secondary_color || secondaryColor}
                        onChange={(e) => {
                          setFieldValue("secondary_color", e.target.value);
                          setSecondaryColor(e.target.value);
                        }}
                        required
                      /> */}
                      <Input
                        name="secondary_color"
                        className="w-32"
                        value={values.secondary_color}
                        onChange={(e) => {
                          setFieldValue("secondary_color", e.target.value);
                          setSecondaryColor(e.target.value);
                        }}
                        required
                      />

                      <Popover>
                        <PopoverTrigger asChild>
                          <div
                            className="w-10 h-10 rounded-full outline-1 outline border-white border-2 cursor-pointer shrink-0"
                            style={{
                              backgroundColor: secondaryColor,
                              outlineColor: secondaryColor,
                            }}
                          />
                        </PopoverTrigger>
                        <PopoverContent>
                          <HexColorPicker
                            color={secondaryColor}
                            onChange={(color) => {
                              setSecondaryColor(color);
                              setFieldValue("secondary_color", color);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit">Update</Button>
            </div>

            <div className="mt-20 border-t">
              {/* <div className="py-8 ">
                <div className="flex gap-5 flex-col md:flex-row">
                  <div className="leading-none md:w-96 lg:w-60 xl:w-[500px] shrink-0">
                    <Label
                      htmlFor="workspace_description"
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed pb-1.5"
                    >
                      Custom Domain
                    </Label>
                    <p className="text-sm text-muted-foreground pb-1.5 md:w-4/5">
                      Custom domains allow you to serve your site from a domain
                    </p>
                  </div>

                  <div className="flex md:w-[500px]">
                    <TextFormField
                      name="custom_domain"
                      placeholder="Enter custom domain"
                      width="w-full"
                      //remove this
                      optional
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost">Cancel</Button>
                      <Button>Save</Button>
                    </div>
                  </div>
                </div>
              </div> */}

              <div className="py-8 ">
                <div className="flex gap-5 flex-col md:flex-row">
                  <div className="leading-none md:w-96 lg:w-60 xl:w-[500px] shrink-0">
                    <Label
                      htmlFor="workspace_description"
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed pb-1.5"
                    >
                      SMTP
                    </Label>
                    <p className="text-sm text-muted-foreground pb-1.5 md:w-4/5">
                      Enables the exchange of emails between servers.
                    </p>
                  </div>

                  <div className="md:w-[500px]">
                    <div className="flex flex-col items-end">
                      <div
                        className={`w-full flex flex-col ${!isEditing ? "gap-4" : ""}`}
                      >
                        {isEditing ? (
                          <>
                            <TextFormField
                              name="smtp_server"
                              label="SMTP Server"
                              placeholder="Enter hostname"
                              value={formData?.smtp_server || ""}
                              onChange={handleChange}
                            />

                            <TextFormField
                              name="smtp_port"
                              label="SMTP Port"
                              placeholder="Enter port"
                              type="text"
                              value={formData.smtp_port?.toString() || ""}
                              onChange={handleChange}
                            />

                            <TextFormField
                              name="smtp_username"
                              label="SMTP Username (email)"
                              placeholder="Enter username"
                              value={formData?.smtp_username || ""}
                              onChange={handleChange}
                            />

                            <TextFormField
                              name="smtp_password"
                              label="SMTP Password"
                              placeholder="Enter password"
                              type="password"
                              value={formData?.smtp_password || ""}
                              onChange={handleChange}
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex gap-6">
                              <span className="whitespace-nowrap">
                                SMTP Server:
                              </span>
                              <span className="font-semibold text-inverted-inverted w-full truncate">
                                {loading
                                  ? "Syncing"
                                  : settings.settings.smtp_server || "None"}
                              </span>
                            </div>

                            <div className="flex gap-6">
                              <span className="whitespace-nowrap">
                                SMTP Port:
                              </span>
                              <span className="font-semibold text-inverted-inverted w-full truncate">
                                {loading
                                  ? "Syncing"
                                  : settings.settings.smtp_port || "None"}
                              </span>
                            </div>

                            <div className="flex gap-6">
                              <span className="whitespace-nowrap">
                                SMTP Username (email):
                              </span>
                              <span className="font-semibold text-inverted-inverted w-full truncate">
                                {loading
                                  ? "Syncing"
                                  : settings.settings.smtp_username || "None"}
                              </span>
                            </div>

                            <div className="flex gap-6">
                              <span className="whitespace-nowrap">
                                SMTP Password:
                              </span>
                              <span className="font-semibold text-inverted-inverted truncate">
                                {loading
                                  ? "Syncing"
                                  : settings.settings.smtp_password
                                    ? "●●●●●●●●"
                                    : "None"}
                              </span>
                            </div>
                          </>
                        )}

                        <div className="flex justify-end">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setIsEditing(false)}
                                disabled={loading}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={async () => {
                                  setIsEditing(false);
                                  await updateSmtpSettings(0, formData);
                                }}
                                disabled={
                                  loading ||
                                  JSON.stringify(formData) ===
                                    JSON.stringify({
                                      smtp_server:
                                        settings.settings.smtp_server,
                                      smtp_port: settings.settings.smtp_port,
                                      smtp_username:
                                        settings.settings.smtp_username,
                                      smtp_password:
                                        settings.settings.smtp_password,
                                    })
                                }
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setIsEditing(true)}
                              type="button"
                              variant="outline"
                              disabled={loading}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* <div>
              {values.use_custom_logo ? (
                <div className="pt-3 flex flex-col items-start gap-3">
                  <div>
                    <h3>Custom Logo</h3>
                    <SubLabel>Current Custom Logo: </SubLabel>
                  </div>
                  <img
                    src={"/api/workspace/logo?workspace_id=" + 0} //temporary id for workspace
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
                  Specify your own logo to replace the standard Arnold AI logo.
                </p>
              )}

              <ImageUpload
                selectedFile={selectedLogo}
                setSelectedFile={setSelectedLogo}
              />
            </div> */}

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
                      href={"#"}
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
                        : `The title for the popup that will be displayed for each user on their initial visit to the application. If left blank AND Custom Popup Content is specified, will use "Welcome to ${values.workspace_name || "Arnold AI"}!".`
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
          </Form>
        )}
      </Formik>
    </div>
  );
}
