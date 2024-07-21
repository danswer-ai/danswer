export type InputType = "list" | "text" | "checkbox" | "select";

export type StringWithDescription = {
  value: string;
  name: string;
  description?: string;
};

export type InputOption = {
  type: InputType;
  query: string;
  label: string;
  name: string;
  optional: boolean;
  description?: string;
  options?: StringWithDescription[];
};

export interface ConnectionConfiguration {
  description: string;
  values: InputOption[];
}

export interface DynamicConnectionFormProps {
  config: ConnectionConfiguration;
  onSubmit: () => void;
  onClose: () => void;
}
