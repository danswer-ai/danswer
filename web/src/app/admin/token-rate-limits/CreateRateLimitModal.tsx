"use client";

import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Form, Formik } from "formik";
import {
  SelectorFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { Teamspace } from "@/lib/types";
import { Scope } from "./types";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateRateLimitModalProps {
  onSubmit: (
    target_scope: Scope,
    period_hours: number,
    token_budget: number,
    team_id: number
  ) => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  forSpecificScope?: Scope;
  forSpecificTeamspace?: number;
}

export const CreateRateLimitModal = ({
  onSubmit,
  setPopup,
  forSpecificScope,
  forSpecificTeamspace,
}: CreateRateLimitModalProps) => {
  const [modalTeamspaces, setModalTeamspaces] = useState([]);
  const [shouldFetchTeamspaces, setShouldFetchTeamspaces] = useState(
    forSpecificScope === Scope.TEAMSPACE
  );

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
        setPopup({
          type: "error",
          message: `Failed to fetch teamspaces: ${error}`,
        });
      }
    };

    if (shouldFetchTeamspaces) {
      fetchData();
    }
  }, [shouldFetchTeamspaces, setPopup]);

  return (
    <div className="mt-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Create a Token Rate Limit</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Token Rate Limit</DialogTitle>
          </DialogHeader>
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
                <div className="flex flex-col space-y-4 pt-4">
                  <div className="flex space-y-2 flex-col">
                    <Label htmlFor="period_hours">Time Window (Hours)</Label>
                    <Input name="period_hours" type="number" />
                  </div>
                  <div className="flex space-y-2 flex-col">
                    <Label htmlFor="token_budget">
                      Token Budget (Thousands)
                    </Label>
                    <Input name="token_budget" type="number" />
                  </div>
                  <div className="flex">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="mx-auto w-64"
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </div>
  );
};
