"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface FieldSchema {
  type: string;
  label: string;
  component: JSX.Element;
  props?: Record<string, any>;
}

interface FormSchema {
  [key: string]: FieldSchema;
}

interface Step {
  title: string;
  fields: string[];
}

interface MultiStepFormProps {
  schema: FormSchema;
  steps: Step[];
}

const MultiStepForm: React.FC<MultiStepFormProps> = ({ schema, steps }) => {
  const router = useRouter();
  const [formStep, setFormStep] = useState<number>(0);
  const [formData, setFormData] = useState<Record<string, any>>(
    Object.keys(schema).reduce((acc, key) => ({ ...acc, [key]: "" }), {})
  );

  const nextFormStep = () => {
    setFormStep((currentStep) => currentStep + 1);
    router.push(`/add?step=${formStep + 1}`);
  };

  const prevFormStep = () => {
    setFormStep((currentStep) => currentStep - 1);
    router.push(`/add?step=${formStep - 1}`);
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // await onSubmit(formData)
  };

  const renderField = (fieldName: string) => {
    const field = schema[fieldName];
    // const Component = field.component
    // return (
    //     <div key={fieldName}>
    //         <label htmlFor={fieldName}>{field.label}</label>
    //         <Component
    //             id={fieldName}
    //             name={fieldName}
    //             value={formData[fieldName]}
    //             onChange={(value: any) => handleInputChange(fieldName, value)}
    //             {...field.props}
    //         />
    //     </div>
    // )
  };

  const currentStep = steps[formStep];

  return (
    <form onSubmit={handleSubmit}>
      <h2>{currentStep.title}</h2>
      {schema.contract.component}
      {/* {currentStep.fields.map(renderField)} */}
      {formStep > 0 && (
        <button type="button" onClick={prevFormStep}>
          Previous
        </button>
      )}
      {formStep < steps.length - 1 && (
        <button type="button" onClick={nextFormStep}>
          Next
        </button>
      )}
      {formStep === steps.length - 1 && <button type="submit">Submit</button>}
    </form>
  );
};

export default MultiStepForm;
