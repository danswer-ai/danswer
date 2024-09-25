import { useState } from "react";
import zxcvbn from "zxcvbn";

export const usePasswordValidation = () => {
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
  const [passwordWarning, setPasswordWarning] = useState<string>("");
  const [hasUppercase, setHasUppercase] = useState(false);
  const [hasNumberOrSpecialChar, setHasNumberOrSpecialChar] = useState(false);

  const passwordHasUppercase = (password: string) => /[A-Z]/.test(password);
  const passwordHasNumberOrSpecialChar = (password: string) =>
    /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password);

  const calculatePasswordStrength = (password: string) => {
    const result = zxcvbn(password);

    setHasUppercase(passwordHasUppercase(password));
    setHasNumberOrSpecialChar(passwordHasNumberOrSpecialChar(password));
    setPasswordStrength(result.score);
    setPasswordFeedback(result.feedback.suggestions || []);
    setPasswordWarning(result.feedback.warning || "");
  };

  return {
    passwordStrength,
    passwordFocused,
    passwordFeedback,
    passwordWarning,
    hasUppercase,
    hasNumberOrSpecialChar,
    calculatePasswordStrength,
    setPasswordFocused,
  };
};
