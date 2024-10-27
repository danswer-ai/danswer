import { Button } from "@/components/ui/button";
import { useFormContext } from "@/context/FormContext";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { FiPlus } from "react-icons/fi";

const NavigationRow = ({
  noAdvanced,
  noCredentials,
  activatedCredential,
  onSubmit,
  isValid,
}: {
  isValid: boolean;
  onSubmit: () => void;
  noAdvanced: boolean;
  noCredentials: boolean;
  activatedCredential: boolean;
}) => {
  const { formStep, prevFormStep, nextFormStep } = useFormContext();

  return (
    <div className="grid w-full grid-cols-3 mt-4">
      <div>
        {((formStep > 0 && !noCredentials) ||
          (formStep > 1 && !noAdvanced)) && (
          <Button onClick={prevFormStep} variant='outline'>
            <ArrowLeft />
            Previous
          </Button>
        )}
      </div>

      <div className="flex justify-center">
        {(formStep > 0 || noCredentials) && (
          <Button disabled={!isValid} onClick={onSubmit}>
            Create Connector
            <FiPlus className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex justify-end">
        {formStep === 0 && (
          <Button
            disabled={!activatedCredential}
            onClick={() => nextFormStep()}
          >
            Continue
            <ArrowRight />
          </Button>
        )}
        {!noAdvanced && formStep === 1 && (
          <Button disabled={!isValid} onClick={() => nextFormStep()} variant='outline'>
            Advanced
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
};
export default NavigationRow;

/* onMouseDown={() => !disabled && onClick()} */
