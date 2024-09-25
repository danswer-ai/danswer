import { Progress } from "@/components/ui/progress";

interface PasswordRequirementsProps {
  password: string;
  hasUppercase: boolean;
  hasNumberOrSpecialChar: boolean;
  passwordStrength: number;
  passwordFeedback: string[];
  passwordWarning: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  hasUppercase,
  hasNumberOrSpecialChar,
  passwordStrength,
  passwordFeedback,
  passwordWarning,
}) => {
  return (
    <div className="bg-background lg:w-[300px] absolute bottom-[calc(100%_+_14px)] left-0 lg:bottom-auto top-0 lg:left-[calc(100%_+_20px)] z-overlay p-4 rounded-md shadow-md space-y-3 text-sm">
      <div className="space-y-2">
        <h3 className="text-base">Password must have:</h3>
        <p className="flex items-center gap-2 whitespace-nowrap">
          <span
            className={`w-2 h-2 flex rounded-full shrink-0 ${
              password.length >= 8 ? "bg-success" : "bg-destructive"
            }`}
          />
          At least 8 characters
        </p>
        <p className="flex items-center gap-2 whitespace-nowrap">
          <span
            className={`w-2 h-2 flex rounded-full shrink-0 ${
              hasUppercase ? "bg-success" : "bg-destructive"
            }`}
          />
          Uppercase letter
        </p>
        <p className="flex items-center gap-2 whitespace-nowrap">
          <span
            className={`w-2 h-2 flex rounded-full shrink-0 ${
              hasNumberOrSpecialChar ? "bg-success" : "bg-destructive"
            }`}
          />
          Number or special character
        </p>
      </div>

      <div>
        <p>
          Strength:{" "}
          <span>
            {passwordStrength === 4
              ? "Strong"
              : passwordStrength === 3
                ? "Good"
                : passwordStrength === 2
                  ? "Weak"
                  : "Very Weak"}
          </span>
        </p>

        <div className="flex gap-2 w-full pt-2">
          <Progress value={passwordStrength >= 1 ? 100 : 0} />
          <Progress value={passwordStrength >= 2 ? 100 : 0} />
          <Progress value={passwordStrength >= 3 ? 100 : 0} />
          <Progress value={passwordStrength >= 4 ? 100 : 0} />
        </div>

        {passwordWarning && (
          <div className="pt-2">
            <h4 className="text-sm font-semibold">Warning:</h4>
            <p>{passwordWarning}</p>
          </div>
        )}

        {passwordFeedback.length > 0 && (
          <div className="pt-2">
            <h4 className="text-sm font-semibold">Suggestions:</h4>
            <ul className="list-disc list-inside">
              {passwordFeedback.map((feedback, index) => (
                <li key={index}>{feedback}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
