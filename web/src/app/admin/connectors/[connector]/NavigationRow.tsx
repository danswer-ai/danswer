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
    <div className="mt-5 md:w-full flex justify-between gap-4 items-start flex-col md:flex-row">
      {((formStep > 0 && !noCredentials) || (formStep > 1 && !noAdvanced)) && (
        <div className="w-full">
          <Button
            onClick={prevFormStep}
            variant="outline"
            className="w-full md:w-auto"
          >
            <ArrowLeft />
            Previous
          </Button>
        </div>
      )}
      {(formStep > 0 || noCredentials) && (
        <div className="flex w-full">
          <Button
            disabled={!isValid}
            onClick={onSubmit}
            type="submit"
            className="w-full md:w-auto"
          >
            Create Connector
            <FiPlus className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex justify-end w-full">
        {formStep === 0 && (
          <Button
            disabled={!activatedCredential}
            onClick={() => nextFormStep()}
            className="w-full md:w-auto"
          >
            Continue
            <ArrowRight />
          </Button>
        )}
        {!noAdvanced && formStep === 1 && (
          <Button
            disabled={!isValid}
            onClick={() => nextFormStep()}
            variant="outline"
            className="w-full md:w-auto"
          >
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
