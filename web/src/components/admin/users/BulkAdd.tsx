"use client";

import {
  withFormik,
  FormikProps,
  FormikErrors,
  Form,
  Field,
  FieldProps,
} from "formik";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const WHITESPACE_SPLIT = /\s+/;
const EMAIL_REGEX = /[^@]+@[^.]+\.[^.]/;

const addUsers = async (url: string, { arg }: { arg: Array<string> }) => {
  return await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ emails: arg }),
  });
};

interface FormProps {
  onSuccess: () => void;
  onFailure: (res: Response) => void;
  onClose: () => void;
  teamspaceId?: string | string[];
}

interface FormValues {
  emails: string;
}

const AddUserFormRenderer = ({
  touched,
  errors,
  isSubmitting,
  onClose,
}: FormikProps<FormValues> & { onClose: () => void }) => (
  <Form>
    <div className="flex flex-col gap-y-2">
      <Field name="emails">
        {({ field }: FieldProps) => (
          <Textarea
            {...field}
            placeholder="Type your emails here."
            id="emails"
            name="emails"
            className="max-h-96"
          />
        )}
      </Field>
      {touched.emails && errors.emails && (
        <div className="text-error text-sm">{errors.emails}</div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Add
        </Button>
      </div>
    </div>
  </Form>
);

const AddUserForm = withFormik<FormProps, FormValues>({
  mapPropsToValues: () => ({
    emails: "",
  }),
  validate: (values: FormValues): FormikErrors<FormValues> => {
    const emails = values.emails.trim().split(WHITESPACE_SPLIT);
    if (!emails.some(Boolean)) {
      return { emails: "Required" };
    }
    for (let email of emails) {
      if (!email.match(EMAIL_REGEX)) {
        return { emails: `${email} is not a valid email` };
      }
    }
    return {};
  },
  handleSubmit: async (values: FormValues, formikBag) => {
    const emails = values.emails.trim().split(WHITESPACE_SPLIT);
    await addUsers(
      formikBag.props.teamspaceId
        ? `/api/manage/admin/users?teamspace_id=${formikBag.props.teamspaceId}`
        : "/api/manage/admin/users",
      { arg: emails }
    ).then((res) => {
      if (res.ok) {
        formikBag.props.onSuccess();
      } else {
        formikBag.props.onFailure(res);
      }
    });

    console.log(formikBag.props.teamspaceId);
  },
})(AddUserFormRenderer);

const BulkAdd = ({ onSuccess, onFailure, onClose, teamspaceId }: FormProps) => {
  return (
    <AddUserForm
      onSuccess={onSuccess}
      onFailure={onFailure}
      onClose={onClose}
      teamspaceId={teamspaceId}
    />
  );
};

export default BulkAdd;
