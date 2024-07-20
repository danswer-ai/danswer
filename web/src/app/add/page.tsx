"use state";
// File: ./src/app/add/page.tsx

import { TextInput } from "@tremor/react";
import { AddForm } from "./Addform";
import MultiStepForm from "./Form";

export default function AddPage() {
  // const { user } = useUser()

  const formConfig = {
    schema: {
      contract: {
        type: "string",
        label: "Contract Details",
        component: <TextInput />,
        props: { placeholder: "Enter contract details" },
      },
      name: {
        type: "string",
        label: "Name",
        component: <TextInput />,
        props: { placeholder: "Enter your name" },
      },
    },
    steps: [
      { title: "Contract Info", fields: ["contract", "category"] },
      { title: "Personal Info", fields: ["name", "email"] },
      {
        title: "Confirm Purchase",
        fields: ["contract", "category", "name", "email"],
      },
    ],
  };

  return (
    <div className="container">
      <MultiStepForm schema={formConfig.schema} steps={formConfig.steps} />
      <h1>Add New Item</h1>
      {/* <AddForm /> */}
    </div>
  );
}
