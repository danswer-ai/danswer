"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { ClosedBookIcon } from "@/components/icons/icons";
import { usePopup } from "@/components/admin/connectors/Popup";
import { ThreeDotsLoader } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Button, Divider, Text } from "@tremor/react";
import { useState } from "react";
import AddPromptModal from "./modals/AddPromptModal";
import EditPromptModal from "./modals/EditPromptModal";
import { useInputPrompts } from "./hooks";
import { PromptLibraryTable } from "./promptLibrary";
import { CreateInputPromptRequest, InputPromptSnapshot } from "./interfaces";

export const PromptPage = ({
  promptLibrary,
  isLoading,
  error,
  refreshPrompts,
  centering = false,
  isPublic,
}: {
  promptLibrary: InputPromptSnapshot[];
  isLoading: boolean;
  error: any;
  refreshPrompts: () => void;
  centering?: boolean;
  isPublic: boolean;
}) => {
  const { popup, setPopup } = usePopup();
  const [newPrompt, setNewPrompt] = useState(false);
  const [newPromptId, setNewPromptId] = useState<number | null>(null);

  const createInputPrompt = async (
    promptData: CreateInputPromptRequest
  ): Promise<InputPromptSnapshot> => {
    const response = await fetch("/api/input_prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...promptData, is_public: isPublic }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to create input prompt");
    }

    refreshPrompts();
    return response.json();
  };

  const editInputPrompt = async (
    promptId: number,
    values: CreateInputPromptRequest
  ) => {
    try {
      const response = await fetch(`/api/input_prompt/${promptId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to update prompt");
      }

      setNewPromptId(null);
      refreshPrompts();
    } catch (err) {
      console.error("Failed to update prompt", err);
    }
  };

  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !promptLibrary) {
    return (
      <ErrorCallout
        errorTitle="Error loading standard answers"
        errorMsg={error?.info?.message || error?.message?.info?.detail}
      />
    );
  }

  const handleEdit = (promptId: number) => {
    setNewPromptId(promptId);
  };

  return (
    <div
      className={`w-full ${centering ? "flex-col flex justify-center" : ""} mb-8`}
    >
      {popup}

      {newPrompt && (
        <AddPromptModal
          onSubmit={createInputPrompt}
          onClose={() => setNewPrompt(false)}
        />
      )}

      {newPromptId && (
        <EditPromptModal
          promptId={newPromptId}
          editInputPrompt={editInputPrompt}
          onClose={() => setNewPromptId(null)}
        />
      )}
      <div className={centering ? "max-w-sm mx-auto" : ""}>
        <Text className="mb-2 my-auto">
          Create prompts that can be accessed with the <i>`/`</i> shortcut in
          Danswer Chat.
        </Text>
      </div>

      <div className="mb-2"></div>

      <Button
        onClick={() => setNewPrompt(true)}
        className={centering ? "mx-auto" : ""}
        color="green"
        size="xs"
      >
        New Prompt
      </Button>

      <Divider />

      <div>
        <PromptLibraryTable
          promptLibrary={promptLibrary}
          setPopup={setPopup}
          refresh={refreshPrompts}
          handleEdit={handleEdit}
        />
      </div>
    </div>
  );
};
const Page = () => {
  const {
    data: promptLibrary,
    error: promptLibraryError,
    isLoading: promptLibraryIsLoading,
    refreshInputPrompts: refreshPrompts,
  } = useInputPrompts(false);

  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ClosedBookIcon size={32} />}
        title="Prompt Library"
      />
      <PromptPage
        promptLibrary={promptLibrary || []}
        isLoading={promptLibraryIsLoading}
        error={promptLibraryError}
        refreshPrompts={refreshPrompts}
        isPublic={true}
      />
    </div>
  );
};
export default Page;
