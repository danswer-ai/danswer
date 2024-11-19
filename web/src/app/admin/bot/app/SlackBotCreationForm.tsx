"use client";

import { TextFormField } from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SlackBot } from "@/lib/types";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { createSlackApp, updateSlackApp } from "./new/lib";
import { Button } from "@/components/ui/button";
import { SourceIcon } from "@/components/SourceIcon";
import { EditableStringFieldDisplay } from "@/components/EditableStringFieldDisplay";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { updateSlackBotField } from "@/lib/updateSlackBotField";
import { Checkbox } from "@/app/admin/settings/SettingsForm";

const SlackTokensForm = ({
  isUpdate,
  initialValues,
  existingSlackBotId,
  refreshSlackBot,
  setPopup,
  router,
}: {
  isUpdate: boolean;
  initialValues: any;
  existingSlackBotId?: number;
  refreshSlackBot?: () => void;
  setPopup: (popup: { message: string; type: "error" | "success" }) => void;
  router: any;
}) => (
  <Formik
    initialValues={initialValues}
    validationSchema={Yup.object().shape({
      bot_token: Yup.string().required(),
      app_token: Yup.string().required(),
    })}
    onSubmit={async (values, formikHelpers) => {
      formikHelpers.setSubmitting(true);

      let response;
      if (isUpdate) {
        response = await updateSlackApp(existingSlackBotId!, values);
      } else {
        response = await createSlackApp(values);
      }
      formikHelpers.setSubmitting(false);
      if (response.ok) {
        if (refreshSlackBot) {
          refreshSlackBot();
        }
        const responseJson = await response.json();
        const appId = isUpdate ? existingSlackBotId : responseJson.id;
        setPopup({
          message: isUpdate
            ? "Successfully updated Slack App!"
            : "Successfully created Slack App!",
          type: "success",
        });
        router.push(`/admin/bot/app/${appId}?u=${Date.now()}`);
      } else {
        const responseJson = await response.json();
        const errorMsg = responseJson.detail || responseJson.message;
        setPopup({
          message: isUpdate
            ? `Error updating Slack App - ${errorMsg}`
            : `Error creating Slack App - ${errorMsg}`,
          type: "error",
        });
      }
    }}
    enableReinitialize={true}
  >
    {({ isSubmitting, setFieldValue }) => (
      <Form className="w-full">
        {!isUpdate && (
          <div className="mb-4">
            Please enter your Slack Bot Token and Slack App Token to give
            Danswerbot access to your Slack!
          </div>
        )}
        <TextFormField
          name="bot_token"
          label="Slack Bot Token"
          type="password"
        />
        <TextFormField
          name="app_token"
          label="Slack App Token"
          type="password"
        />
        <div className="flex justify-end w-full mt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="submit"
            size="default"
          >
            {isUpdate ? "Update!" : "Create!"}
          </Button>
        </div>
      </Form>
    )}
  </Formik>
);

export const ExistingSlackBotForm = ({
  existingSlackBot,
  refreshSlackBot,
}: {
  existingSlackBot: SlackBot;
  refreshSlackBot?: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formValues, setFormValues] = useState(existingSlackBot);
  const { popup, setPopup } = usePopup();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleUpdateField = async (
    field: keyof SlackBot,
    value: string | boolean
  ) => {
    try {
      const response = await updateSlackBotField(
        existingSlackBot,
        field,
        value
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setPopup({
        message: `Connector ${field} updated successfully`,
        type: "success",
      });
    } catch (error) {
      setPopup({
        message: `Failed to update connector ${field}`,
        type: "error",
      });
    }
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        isExpanded
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <div>
      {popup}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="my-auto">
            <SourceIcon iconSize={36} sourceType={"slack"} />
          </div>
          <EditableStringFieldDisplay
            value={formValues.name}
            isEditable={true}
            onUpdate={(value) => handleUpdateField("name", value)}
            scale={2.5}
          />
        </div>

        <div className="flex flex-col" ref={dropdownRef}>
          <div className="border rounded-lg border-gray-200">
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
              <span>Tokens</span>
            </div>
          </div>

          {isExpanded && (
            <div className="bg-white border rounded-lg border-gray-200 shadow-lg absolute mt-12 right-0 z-10 w-full md:w-3/4 lg:w-1/2">
              <div className="p-4">
                <SlackTokensForm
                  isUpdate={true}
                  initialValues={formValues}
                  existingSlackBotId={existingSlackBot.id}
                  refreshSlackBot={refreshSlackBot}
                  setPopup={setPopup}
                  router={router}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4">
        <div className="inline-block border rounded-lg border-gray-200 px-2 py-2">
          <Checkbox
            label="Enabled"
            checked={formValues.enabled}
            onChange={(e) => handleUpdateField("enabled", e.target.checked)}
          />
        </div>
      </div>
    </div>
  );
};

export const NewSlackBotForm = ({}: {}) => {
  const [formValues] = useState({
    name: "Default Slack App Name",
    description: "This is a default Slack app description",
    enabled: true,
    bot_token: "",
    app_token: "",
  });
  const { popup, setPopup } = usePopup();
  const router = useRouter();

  return (
    <div>
      {popup}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="my-auto">
            <SourceIcon iconSize={36} sourceType={"slack"} />
          </div>
          <EditableStringFieldDisplay
            value={formValues.name}
            isEditable={true}
            onUpdate={async () => {}}
            scale={2.5}
          />
        </div>
      </div>
      <div className="p-4">
        <SlackTokensForm
          isUpdate={false}
          initialValues={formValues}
          setPopup={setPopup}
          router={router}
        />
      </div>
    </div>
  );
};
