"use client";

import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Form, Formik } from "formik";
import {
  SelectorFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Teamspace } from "@/lib/types";
import { Scope } from "./types";
import { useToast } from "@/hooks/use-toast";

interface CreateRateLimitModalProps {
  onSubmit: (
    target_scope: Scope,
    period_hours: number,
    token_budget: number,
    team_id: number
  ) => void;
  forSpecificScope?: Scope;
  forSpecificTeamspace?: number;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}

export const CreateRateLimitModal = ({
  onSubmit,
  forSpecificScope,
  forSpecificTeamspace,
  isOpen,
  setIsOpen,
  onClose,
}: CreateRateLimitModalProps) => {
  const [modalTeamspaces, setModalTeamspaces] = useState([]);
  const [shouldFetchTeamspaces, setShouldFetchTeamspaces] = useState(
    forSpecificScope === Scope.TEAMSPACE
  );
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/manage/admin/teamspace");
        const data = await response.json();
        const options = data.map((teamspace: Teamspace) => ({
          name: teamspace.name,
          value: teamspace.id,
        }));

        setModalTeamspaces(options);
        setShouldFetchTeamspaces(false);
      } catch (error) {
        toast({
          title: "Fetch Failed",
          description: `Unable to retrieve user teamspaces. Reason: ${error}`,
          variant: "destructive",
        });
      }
    };

    if (shouldFetchTeamspaces) {
      fetchData();
    }
  }, [shouldFetchTeamspaces]);

  return (
    <div>
      <Formik
        initialValues={{
          enabled: true,
          period_hours: "",
          token_budget: "",
          target_scope: forSpecificScope || Scope.GLOBAL,
          teamspace_id: forSpecificTeamspace,
        }}
        validationSchema={Yup.object().shape({
          period_hours: Yup.number()
            .required("Time Window is a required field")
            .min(1, "Time Window must be at least 1 hour"),
          token_budget: Yup.number()
            .required("Token Budget is a required field")
            .min(1, "Token Budget must be at least 1"),
          target_scope: Yup.string().required(
            "Target Scope is a required field"
          ),
          teamspace_id: Yup.string().test(
            "teamspace_id",
            "Teamspace is a required field",
            (value, context) => {
              return (
                context.parent.target_scope !== "teamspace" ||
                (context.parent.target_scope === "teamspace" &&
                  value !== undefined)
              );
            }
          ),
        })}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);
          onSubmit(
            values.target_scope,
            Number(values.period_hours),
            Number(values.token_budget),
            Number(values.teamspace_id)
          );
          setIsOpen(false);
          return formikHelpers.setSubmitting(false);
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            {!forSpecificScope && (
              <SelectorFormField
                name="target_scope"
                label="Target Scope"
                options={[
                  { name: "Global", value: Scope.GLOBAL },
                  { name: "User", value: Scope.USER },
                  { name: "Teamspace", value: Scope.TEAMSPACE },
                ]}
                includeDefault={false}
                onSelect={(selected) => {
                  setFieldValue("target_scope", selected);
                  if (selected === Scope.TEAMSPACE) {
                    setShouldFetchTeamspaces(true);
                  }
                }}
              />
            )}
            {forSpecificTeamspace === undefined &&
              values.target_scope === Scope.TEAMSPACE && (
                <SelectorFormField
                  name="teamspace_id"
                  label="Teamspace"
                  options={modalTeamspaces}
                  includeDefault={false}
                />
              )}

            <div className="pt-2" />
            <TextFormField
              name="period_hours"
              label="Time Window (Hours)"
              type="number"
              placeholder=""
            />

            <div className="pt-2" />
            <TextFormField
              name="token_budget"
              label="Token Budget (Thousands)"
              type="number"
              placeholder=""
            />
            <div className="flex pt-4 justify-end gap-2">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => onClose()}
                variant="ghost"
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                Create
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
