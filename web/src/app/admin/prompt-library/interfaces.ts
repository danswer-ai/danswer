export interface InputPrompt {
  id: number;
  prompt: string;
  content: string;
  active: boolean;
}

export interface EditPromptModalProps {
  onClose: () => void;

  promptId: number;
  editInputPrompt: (
    promptId: number,
    values: CreateInputPromptRequest
  ) => Promise<void>;
}
export interface CreateInputPromptRequest {
  prompt: string;
  content: string;
}

export interface AddPromptModalProps {
  onClose: () => void;
  onSubmit: (promptData: CreateInputPromptRequest) => void;
}
export interface PromptData {
  id: number;
  prompt: string;
  content: string;
}

export interface InputPromptSnapshot {
  id: number;
  prompt: string;
  content: string;
  active: boolean;
}
