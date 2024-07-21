import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface FormContextType {
  formStep: number;
  formValues: Record<string, any>;
  setFormValues: (values: Record<string, any>) => void;
  nextFormStep: (contract?: string) => void;
  prevFormStep: () => void;
  formStepToLast: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const FormProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [formStep, setFormStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const nextFormStep = (values = "") => {
    setFormStep(1);
    setFormValues((prevValues) => ({ ...prevValues, values }));
  };

  const prevFormStep = () => {
    setFormStep((currentStep) => Math.max(currentStep - 1, 0));
  };

  const formStepToLast = () => {
    setFormStep(2);
  };

  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    // Create a new URLSearchParams object
    const updatedSearchParams = new URLSearchParams(searchParams.toString());
    // Update or add the 'step' parameter
    updatedSearchParams.set("step", formStep.toString());

    // Construct the new URL
    const newUrl = `${pathname}?${updatedSearchParams.toString()}`;

    // Use router.push with the constructed URL
    router.push(newUrl);
  }, [formStep, router]);

  const contextValue: FormContextType = {
    formStep,
    formValues,
    setFormValues: (values) =>
      setFormValues((prevValues) => ({ ...prevValues, ...values })),
    nextFormStep,
    prevFormStep,
    formStepToLast,
  };

  return (
    <FormContext.Provider value={contextValue}>{children}</FormContext.Provider>
  );
};

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
};
