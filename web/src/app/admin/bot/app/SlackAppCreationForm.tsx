"use client";

import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SlackApp } from "@/lib/types";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { createSlackApp, updateSlackApp } from "./new/lib";
import { Button } from "@/components/ui/button";
import { SourceIcon } from "@/components/SourceIcon";
import { EditableStringFieldDisplay } from "@/components/EditableStringFieldDisplay";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { updateSlackAppName } from "@/lib/updateSlackAppName";

const SlackAppForm = ({
  isUpdate,
  initialValues,
  existingSlackAppId,
  refreshSlackApp,
  setPopup,
  router,
  onValuesChange,
}: {
  isUpdate: boolean;
  initialValues: any;
  existingSlackAppId?: number;
  refreshSlackApp?: () => void;
  setPopup: (popup: { message: string; type: "error" | "success" }) => void;
  router: any;
  onValuesChange?: (values: any) => void;
}) => (
  <Formik
    initialValues={initialValues}
    validationSchema={Yup.object().shape({
      enabled: Yup.boolean().required(),
      bot_token: Yup.string().required(),
      app_token: Yup.string().required(),
    })}
    onSubmit={async (values, formikHelpers) => {
      formikHelpers.setSubmitting(true);

      let response;
      if (isUpdate) {
        response = await updateSlackApp(existingSlackAppId!, values);
      } else {
        response = await createSlackApp(values);
      }
      formikHelpers.setSubmitting(false);
      if (response.ok) {
        if (refreshSlackApp) {
          refreshSlackApp();
        }
        const responseJson = await response.json();
        const appId = isUpdate ? existingSlackAppId : responseJson.id;
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
        <div className="flex items-center w-full">
          <BooleanFormField
            name="enabled"
            label="Enabled"
            subtext="While enabled, this Slack app will run in the background"
          />
          <div className="pl-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="submit"
              size="default"
            >
              {isUpdate ? "Update!" : "Create!"}
            </Button>
          </div>
        </div>
      </Form>
    )}
  </Formik>
);

export const SlackAppCreationForm = ({
  existingSlackApp,
  refreshSlackApp,
}: {
  existingSlackApp?: SlackApp;
  refreshSlackApp?: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUpdate = existingSlackApp !== undefined;
  const [formValues, setFormValues] = useState(
    isUpdate
      ? existingSlackApp
      : {
          name: "Default Slack App Name",
          description: "This is a default Slack app description",
          enabled: true,
          bot_token: "",
          app_token: "",
        }
  );

  const handleUpdateName = async (newName: string) => {
    if (isUpdate) {
      try {
        const response = await updateSlackAppName(existingSlackApp, newName);
        if (!response.ok) {
          throw new Error(await response.text());
        }
        setPopup({
          message: "Connector name updated successfully",
          type: "success",
        });
      } catch (error) {
        setPopup({
          message: `Failed to update connector name`,
          type: "error",
        });
      }
    }
    setFormValues((prev) => ({ ...prev, name: newName }));
  };

  const handleUpdateDescription = async (newDescription: string) => {
    setFormValues((prev) => ({ ...prev, description: newDescription }));
  };

  const { popup, setPopup } = usePopup();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            onUpdate={handleUpdateName}
            scale={2.5}
          />
        </div>

        <div className="flex flex-col" ref={dropdownRef}>
          <div className="border rounded-lg border-gray-200">
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded || !isUpdate ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
              <span>Configuration</span>
            </div>
          </div>

          {(isExpanded || !isUpdate) && (
            <div className="absolute mt-12 right-0 z-10 bg-white border rounded-lg border-gray-200 shadow-lg w-full md:w-3/4 lg:w-1/2">
              <div className="p-4">
                <SlackAppForm
                  isUpdate={isUpdate}
                  initialValues={formValues}
                  existingSlackAppId={existingSlackApp?.id}
                  refreshSlackApp={refreshSlackApp}
                  setPopup={setPopup}
                  router={router}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex">
        <div className="flex-1 max-w-[50%]">
          <div className="text-sm mt-1">Description:</div>
          <EditableStringFieldDisplay
            value={formValues.description}
            isEditable={true}
            textClassName="text-sm mt-1"
            onUpdate={handleUpdateDescription}
            useTextArea={true}
          />
        </div>
      </div>
    </div>
  );
};
