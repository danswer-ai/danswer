export const validatePassword = (values: string) => {
  let error = "";
  const passwordRegex = /(?=.*[0-9])/;
  if (!values) {
    error = "*Required";
  } else if (values.length < 8) {
    error = "*Password must be 8 characters long.";
  } else if (!passwordRegex.test(values)) {
    error = "*Invalid password. Must contain one number.";
  }
  return error;
};

export const validateConfirmPassword = (pass: string, value: string) => {
  let error = "";
  if (pass && value) {
    if (pass !== value) {
      error = "Password not matched";
    }
  }
  return error;
};
