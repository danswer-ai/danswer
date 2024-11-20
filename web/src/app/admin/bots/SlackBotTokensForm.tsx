import { Form, Formik } from "formik";
import * as Yup from "yup";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { SlackBot } from "@/lib/types";
import { TextFormField } from "@/components/admin/connectors/Field";
import CardSection from "@/components/admin/CardSection";
import { Button } from "@/components/ui/button";
import { updateSlackBot, SlackBotCreationRequest } from "./new/lib";

interface SlackBotTokensFormProps {
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  existingSlackApp?: SlackBot;
  onTokensSet?: (tokens: { bot_token: string; app_token: string }) => void;
  embedded?: boolean;
  noForm?: boolean;
}

export const SlackBotTokensForm = ({
  onClose,
  setPopup,
  existingSlackApp,
  onTokensSet,
  embedded = true,
  noForm = true,
}: SlackBotTokensFormProps) => {
  const Wrapper = embedded ? "div" : CardSection;

  const FormWrapper = noForm ? "div" : Form;

  return (
    <Wrapper className="w-full">
      <Formik
        initialValues={existingSlackApp || { app_token: "", bot_token: "" }}
        validationSchema={Yup.object().shape({
          bot_token: Yup.string().required(),
          app_token: Yup.string().required(),
        })}
        onSubmit={async (values, formikHelpers) => {
          if (embedded && onTokensSet) {
            onTokensSet(values);
            return;
          }

          formikHelpers.setSubmitting(true);
          const response = await updateSlackBot(
            existingSlackApp?.id || 0,
            values as SlackBotCreationRequest
          );
          formikHelpers.setSubmitting(false);
          if (response.ok) {
            setPopup({
              message: "Successfully set Slack tokens!",
              type: "success",
            });
            onClose();
          } else {
            const errorMsg = await response.text();
            setPopup({
              message: `Error setting Slack tokens - ${errorMsg}`,
              type: "error",
            });
          }
        }}
      >
        {({ isSubmitting }) => (
          <FormWrapper className="w-full">
            <TextFormField
              width="w-full"
              name="bot_token"
              label="Slack Bot Token"
              type="password"
            />
            <TextFormField
              width="w-full"
              name="app_token"
              label="Slack App Token"
              type="password"
            />
            {!embedded && (
              <div className="flex w-full">
                <Button type="submit" disabled={isSubmitting} variant="submit">
                  Set Tokens
                </Button>
              </div>
            )}
          </FormWrapper>
        )}
      </Formik>
    </Wrapper>
  );
};
