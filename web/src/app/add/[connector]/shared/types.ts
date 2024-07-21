export type inputType = "list" | "string" | "checkbox" | "select";

export type inputOption = {
  type: inputType;
  query: string;
  label: string;
  name: string;
  optional: boolean;
};

export interface ConnectionConfiguration {
  description: string;
  values: inputOption[];
}
