"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Divider, Text } from "@tremor/react";
import { useState } from "react";
import AddPromptModal from "./modals/AddPromptModal";
import EditPromptModal from "./modals/EditPromptModal";
import { PromptLibraryTable } from "./promptLibrary";
import { CreateInputPromptRequest, InputPrompt } from "./interfaces";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/CustomModal";
import { BookstackIcon } from "@/components/icons/icons";
import { useToast } from "@/hooks/use-toast";

export const PromptSection = ({
  promptLibrary,
  isLoading,
  error,
  refreshPrompts,
  centering = false,
  isPublic,
}: {
  promptLibrary: InputPrompt[];
  isLoading: boolean;
  error: any;
  refreshPrompts: () => void;
  centering?: boolean;
  isPublic: boolean;
}) => {
  const { toast } = useToast();
  const [newPrompt, setNewPrompt] = useState(false);
  const [newPromptId, setNewPromptId] = useState<number | null>(null);

  const createInputPrompt = async (
    promptData: CreateInputPromptRequest
  ): Promise<InputPrompt> => {
    const response = await fetch("/api/input_prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...promptData, is_public: isPublic }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      toast({
        title: "Input Prompt Creation Failed",
        description: `Error: ${errorMsg}`,
        variant: "destructive",
      });
      throw new Error(errorMsg);
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
        const errorMsg = await response.text();
        toast({
          title: "Prompt Update Failed",
          description: `Error: ${errorMsg}`,
          variant: "destructive",
        });
        return;
      }

      setNewPromptId(null);
      refreshPrompts();
    } catch (err) {
      toast({
        title: "Update Error",
        description: `Failed to update prompt: ${err}`,
        variant: "destructive",
      });
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
    console.log(promptId);
  };

  return (
    <div
      className={`w-full ${centering ? "flex-col flex justify-center" : ""} mb-8`}
    >
      {/* {newPrompt && (
        <AddPromptModal
          onSubmit={createInputPrompt}
          onClose={() => setNewPrompt(false)}
        />
      )} */}

      {newPromptId && (
        <EditPromptModal
          promptId={newPromptId}
          editInputPrompt={editInputPrompt}
          onClose={() => setNewPromptId(null)}
        />
      )}
      <div className={centering ? "max-w-sm mx-auto" : ""}>
        <Text className="my-auto mb-2">
          Create prompts that can be accessed with the <i>`/`</i> shortcut in
          Arnold AI Chat.{" "}
          {isPublic
            ? "Prompts created here will be accessible to all users."
            : "Prompts created here will be available only to you."}
        </Text>
      </div>

      <div className="mb-2"></div>

      <CustomModal
        trigger={
          <Button
            onClick={() => setNewPrompt(true)}
            className={centering ? "mx-auto" : ""}
          >
            New Prompt
          </Button>
        }
        onClose={() => setNewPrompt(false)}
        open={newPrompt}
        title={
          <p className="flex items-center gap-2">
            <BookstackIcon size={20} />
            Add prompt
          </p>
        }
      >
        <AddPromptModal
          onSubmit={createInputPrompt}
          onClose={() => setNewPrompt(false)}
        />
      </CustomModal>

      <Divider />

      <div>
        <PromptLibraryTable
          isPublic={isPublic}
          promptLibrary={promptLibrary}
          refresh={refreshPrompts}
          handleEdit={handleEdit}
        />
      </div>
    </div>
  );
};
