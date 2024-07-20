"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface FormData {
  contract: string;
  name: string;
  email: string;
}

export const AddForm: React.FC = () => {
  const router = useRouter();
  const [formStep, setFormStep] = useState<number>(0);
  const [formData, setFormData] = useState<FormData>({
    contract: "",
    name: "",
    email: "",
  });

  const nextFormStep = () => {
    setFormStep((currentStep) => currentStep + 1);
    router.push(`/add?step=${formStep + 1}`);
  };

  const prevFormStep = () => {
    setFormStep((currentStep) => currentStep - 1);
    router.push(`/add?step=${formStep - 1}`);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Here you would typically send the data to a server
  };

  return (
    <form onSubmit={handleSubmit}>
      {formStep === 0 && (
        <div>
          <h2>Step 1: Contract Info</h2>
          <input
            type="text"
            name="contract"
            value={formData.contract}
            onChange={handleInputChange}
            placeholder="Enter contract details"
          />
          <button type="button" onClick={nextFormStep}>
            Next
          </button>
        </div>
      )}

      {formStep === 1 && (
        <div>
          <h2>Step 2: Personal Info</h2>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your name"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
          />
          <button type="button" onClick={prevFormStep}>
            Previous
          </button>
          <button type="button" onClick={nextFormStep}>
            Next
          </button>
        </div>
      )}

      {formStep === 2 && (
        <div>
          <h2>Step 3: Confirm Purchase</h2>
          <p>Contract: {formData.contract}</p>
          <p>Name: {formData.name}</p>
          <p>Email: {formData.email}</p>
          <button type="button" onClick={prevFormStep}>
            Previous
          </button>
          <button type="submit">Submit</button>
        </div>
      )}
    </form>
  );
};
