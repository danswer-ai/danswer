"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { BookstackIcon } from "@/components/icons/icons";
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

const Main = () => {
  const { popup, setPopup } = usePopup();
  const [newPrompt, setNewPrompt] = useState(false);
  const [newPromptId, setNewPromptId] = useState<number | null>(null);

  const {
    data: promptLibrary,
    error: promptLibraryError,
    isLoading: promptLibraryIsLoading,
    refreshInputPrompts: refreshPrompts,
  } = useInputPrompts();

  const createInputPrompt = async (
    promptData: CreateInputPromptRequest
  ): Promise<InputPromptSnapshot> => {
    const response = await fetch("/api/input_prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(promptData),
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

  if (promptLibraryIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (promptLibraryError || !promptLibrary) {
    return (
      <ErrorCallout
        errorTitle="Error loading standard answers"
        errorMsg={
          promptLibraryError.info?.message ||
          promptLibraryError.message.info?.detail
        }
      />
    );
  }

  const handleEdit = (promptId: number) => {
    setNewPromptId(promptId);
  };

  return (
    <div className="mb-8">
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

      <Text className="mb-2">
        Create prompts that can be accessed with the <i>`/`</i> shortcut in
        Danswer Chat.
      </Text>

      {promptLibrary.length == 0 && (
        <Text className="mb-2">Add your first prompt below!</Text>
      )}
      <div className="mb-2"></div>

      <Button
        onClick={() => setNewPrompt(true)}
        className="my-auto"
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
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<BookstackIcon size={32} />}
        title="Prompt Library"
      />
      <Main />
    </div>
  );
};

export default Page;
