import { SubLabel } from "@/components/admin/connectors/Field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, useFormikContext } from "formik";
export default function NumberInput({
  label,
  optional,
  description,
  name,
  showNeverIfZero,
}: {
  label: string;
  name: string;
  optional?: boolean;
  description?: string;
  showNeverIfZero?: boolean;
}) {
  return (
    <div className="w-full flex flex-col">
      <div className="grid gap-1 pb-1.5">
       {label && (
        <Label className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed">
          {label} {optional && <span className="ml-1 text-text-500">(optional)</span>}
        </Label>
      )}
      {description && <SubLabel>{description}</SubLabel>}</div>

      <Input
        type="number"
        name={name}
        min="-1"
      />
    </div>
  );
}
