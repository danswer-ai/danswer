import { LoadingAnimation } from "@/components/Loading";
import {
  BooleanFormField,
  SectionHeader,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { LLM_OPTIONS_URL } from "@/components/openai/constants";
import { fetcher } from "@/lib/fetcher";
import { TokenBudgetConfig } from "@/lib/types";
import { Button, Divider, Text } from "@tremor/react";
import { Form, Formik } from "formik";
import { useCallback, useEffect } from "react";
import useSWR from "swr";

function updateTokenBudgetConfig(data: TokenBudgetConfig) {
  return fetch(LLM_OPTIONS_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export const LLMOptions = () => {
  const { popup, setPopup } = usePopup();

  const { data, isLoading, error, mutate } = useSWR<TokenBudgetConfig>(
    LLM_OPTIONS_URL,
    fetcher
  );

  // Set config on initial load
  useEffect(() => {
    if (isLoading) return;

    if (error) {
      setPopup({
        message: "Failed to load current LLM options.",
        type: "error",
      });
      return;
    }
  }, [isLoading, data, error, setPopup]);

  const onSubmit = useCallback(
    async (values: TokenBudgetConfig) => {
      try {
        const response = await updateTokenBudgetConfig(values);

        await mutate(values);

        if (!response.ok) {
          throw new Error("Failed to update LLM options.");
        }

        setPopup({
          message: "Updated LLM Options",
          type: "success",
        });
      } catch (e) {
        setPopup({
          message: "Failed to update LLM options.",
          type: "error",
        });
      }
    },
    [mutate, setPopup]
  );

  const initialValues = {
    enable_token_budget: data?.enable_token_budget || false,
    token_budget: data?.token_budget || "",
    token_budget_time_period: data?.token_budget_time_period || "",
  };

  return (
    <>
      <Divider />
      <SectionHeader>Token Budget</SectionHeader>
      <Text>
        Set a maximum token use per time period. If the token budget is
        exceeded, the persona will not be able to respond to queries until the
        next time period.
      </Text>
      {popup}
      <br />
      {isLoading ? (
        <LoadingAnimation text="Loading" />
      ) : (
        <LLMOptionsForm initialValues={initialValues} onSubmit={onSubmit} />
      )}
    </>
  );
};

interface LLMOptionsFormProps {
  initialValues: TokenBudgetConfig;
  onSubmit: (values: TokenBudgetConfig) => void;
}

export const LLMOptionsForm = ({
  initialValues,
  onSubmit,
}: LLMOptionsFormProps) => {
  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues}
      onSubmit={onSubmit}
    >
      {({ isSubmitting, values, setFieldValue, setValues }) => {
        return (
          <Form>
            <>
              <BooleanFormField
                name="enable_token_budget"
                label="Enable Token Budget"
                subtext="If enabled, the persona will be limited to the token budget specified below."
                onChange={(e) => {
                  setFieldValue("enable_token_budget", e.target.checked);
                }}
              />
              {values.enable_token_budget && (
                <>
                  <TextFormField
                    name="token_budget"
                    label="Token Budget"
                    subtext={
                      <div>
                        How many tokens (in thousands) can be used per time
                        period? If unspecified, no limit will be set.
                      </div>
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only integer values
                      if (value === "" || /^[0-9]+$/.test(value)) {
                        setFieldValue("token_budget", value);
                      }
                    }}
                  />
                  <TextFormField
                    name="token_budget_time_period"
                    label="Token Budget Time Period (hours)"
                    subtext={
                      <div>
                        Specify the length of the time period, in hours, over
                        which the token budget will be applied.
                      </div>
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only integer values
                      if (value === "" || /^[0-9]+$/.test(value)) {
                        setFieldValue("token_budget_time_period", value);
                      }
                    }}
                  />
                </>
              )}
            </>
            <div className="flex">
              <Button
                className="w-64 mx-auto"
                type="submit"
                disabled={isSubmitting}
              >
                Submit
              </Button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};
