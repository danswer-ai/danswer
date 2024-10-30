import React, { useState } from "react";
import { ValidSources } from "@/lib/types";
import { FaAccusoft } from "react-icons/fa";
import { submitCredential } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik, FormikHelpers } from "formik";
import { getSourceDocLink } from "@/lib/sources";
import GDriveMain from "@/app/admin/connectors/[connector]/pages/gdrive/GoogleDrivePage";
import { Connector } from "@/lib/connectors/connectors";
import {
  Credential,
  credentialTemplates,
  getDisplayNameForCredentialKey,
} from "@/lib/connectors/credentials";
import { getCurrentUser } from "@/lib/user";
import { User, UserRole } from "@/lib/types";
import { PlusCircleIcon } from "../../icons/icons";
import { GmailMain } from "@/app/admin/connectors/[connector]/pages/gmail/GmailPage";
import { ActionType, dictionaryType } from "../types";
import { createValidationSchema } from "../lib";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";
import {
  IsPublicGroupSelectorFormType,
  IsPublicGroupSelector,
} from "@/components/IsPublicGroupSelector";
import { useUser } from "@/components/user/UserProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CreateButton = ({
  onClick,
  isSubmitting,
  isAdmin,
  groups,
}: {
  onClick: () => void;
  isSubmitting: boolean;
  isAdmin: boolean;
  groups: number[];
}) => (
  <div className="flex justify-end w-full">
    <Button
      onClick={onClick}
      type="button"
      disabled={isSubmitting || (!isAdmin && groups.length === 0)}
    >
        <PlusCircleIcon size={16} className="text-indigo-100" />
        Create
    </Button>
  </div>
);

type formType = IsPublicGroupSelectorFormType & {
  name: string;
  [key: string]: any; // For additional credential fields
};

export default function CreateCredential({
  hideSource,
  sourceType,
  close,
  onClose = () => null,
  onSwitch,
  onSwap = async () => null,
  swapConnector,
  refresh = () => null,
}: {
  // Source information
  hideSource?: boolean; // hides docs link
  sourceType: ValidSources;

  // Optional toggle- close section after selection?
  close?: boolean;

  // Special handlers
  onClose?: () => void;
  // Switch currently selected credential
  onSwitch?: (selectedCredential: Credential<any>) => Promise<void>;
  // Switch currently selected credential + link with connector
  onSwap?: (selectedCredential: Credential<any>, connectorId: number) => void;

  // For swapping credentials on selection
  swapConnector?: Connector<any>;

  // Mutating parent state
  refresh?: () => void;
}) {
  const { toast } = useToast();
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  const { isLoadingUser, isAdmin } = useUser();
  if (isLoadingUser) {
    return <></>;
  }

  const handleSubmit = async (
    values: formType,
    formikHelpers: FormikHelpers<formType>,
    action: ActionType
  ) => {
    const { setSubmitting, validateForm } = formikHelpers;

    const errors = await validateForm(values);
    if (Object.keys(errors).length > 0) {
      formikHelpers.setErrors(errors);
      return;
    }

    setSubmitting(true);
    formikHelpers.setSubmitting(true);

    const { name, is_public, groups, ...credentialValues } = values;

    try {
      const response = await submitCredential({
        credential_json: credentialValues,
        admin_public: true,
        curator_public: is_public,
        groups: groups,
        name: name,
        source: sourceType,
      });

      const { message, isSuccess, credential } = response;

      if (!credential) {
        throw new Error("No credential returned");
      }

      if (isSuccess && swapConnector) {
        if (action === "createAndSwap") {
          onSwap(credential, swapConnector.id);
        } else {
          toast({
            title: "Success",
            description: "Created new credential!",
            variant: "success",
          });
        }
        onClose();
      } else {
        toast({
          title: isSuccess ? "Success" : "Error",
          description: message,
          variant: isSuccess ? "success" : "destructive",
        });
      }

      if (close) {
        onClose();
      }
      await refresh();

      if (onSwitch) {
        onSwitch(response?.credential!);
      }
    } catch (error) {
      console.error("Error submitting credential:", error);
      toast({
        title: "Error",
        description: "Error submitting credential",
        variant: "destructive",
      });
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  if (sourceType == "gmail") {
    return <GmailMain />;
  }

  if (sourceType == "google_drive") {
    return <GDriveMain />;
  }

  const credentialTemplate: dictionaryType = credentialTemplates[sourceType];
  const validationSchema = createValidationSchema(credentialTemplate);

  return (
    <Formik
      initialValues={
        {
          name: "",
          is_public: isAdmin || !isPaidEnterpriseFeaturesEnabled,
          groups: [],
        } as formType
      }
      validationSchema={validationSchema}
      onSubmit={() => {}} // This will be overridden by our custom submit handlers
    >
      {(formikProps) => (
        <Form>
          {!hideSource && (
            <p className="text-sm">
              Check our
              <a
                className="text-blue-600 hover:underline"
                target="_blank"
                href={getSourceDocLink(sourceType) || ""}
              >
                {" "}
                docs{" "}
              </a>
              for information on setting up this connector.
            </p>
          )}
          <Card className="mt-4">
            <CardContent>
              <TextFormField
                name="name"
                placeholder="(Optional) credential name.."
                label="Name:"
                optional
              />
              {Object.entries(credentialTemplate).map(([key, val]) => (
                <TextFormField
                  key={key}
                  name={key}
                  placeholder={val}
                  label={getDisplayNameForCredentialKey(key)}
                  type={
                    key.toLowerCase().includes("token") ||
                    key.toLowerCase().includes("password")
                      ? "password"
                      : "text"
                  }
                />
              ))}
              {!swapConnector && (
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-end">
                  <div className="w-full sm:w-3/4 mb-4 sm:mb-0">
                    {isPaidEnterpriseFeaturesEnabled && (
                      <div className="flex flex-col items-start">
                        {isAdmin && (
                          <AdvancedOptionsToggle
                            showAdvancedOptions={showAdvancedOptions}
                            setShowAdvancedOptions={setShowAdvancedOptions}
                          />
                        )}
                        {(showAdvancedOptions || !isAdmin) && (
                          <IsPublicGroupSelector
                            formikProps={formikProps}
                            objectName="credential"
                            publicToWhom="Curators"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-full sm:w-1/4">
                    <CreateButton
                      onClick={() =>
                        handleSubmit(formikProps.values, formikProps, "create")
                      }
                      isSubmitting={formikProps.isSubmitting}
                      isAdmin={isAdmin}
                      groups={formikProps.values.groups}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {swapConnector && (
            <div className="flex gap-x-4 w-full mt-8 justify-end">
              <Button
                onClick={() =>
                  handleSubmit(formikProps.values, formikProps, "createAndSwap")
                }
                type="button"
                disabled={formikProps.isSubmitting}
              >
                  <FaAccusoft />
                  Create
              </Button>
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
}
