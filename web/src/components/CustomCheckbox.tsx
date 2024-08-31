import { Checkbox } from "./ui/checkbox";

export const CustomCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: () => void;
}) => {
  return <Checkbox checked={checked} onChange={onChange} />;
};
