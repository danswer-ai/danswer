"use client";

import React, { useEffect } from "react";
import { Modal } from "../../../../components/Modal";
import { FilterManager, LlmOverrideManager } from "@/lib/hooks";
import { FiltersTab } from "./FiltersTab";
import { AssistantsTab } from "./AssistantsTab";
import { Persona } from "@/app/admin/assistants/interfaces";
import { LLMProviderDescriptor } from "@/app/admin/models/llm/interfaces";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Filter } from "lucide-react";

export function ConfigurationModal({
  activeTab,
  setActiveTab,
  onClose,
  availableAssistants,
  selectedAssistant,
  setSelectedAssistant,
  filterManager,
  llmProviders,
  llmOverrideManager,
  chatSessionId,
}: {
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  onClose: () => void;
  availableAssistants: Persona[];
  selectedAssistant: Persona;
  setSelectedAssistant: (assistant: Persona) => void;
  filterManager: FilterManager;
  llmProviders: LLMProviderDescriptor[];
  llmOverrideManager: LlmOverrideManager;
  chatSessionId?: number;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!activeTab) return null;

  return (
    <Modal
      onOutsideClick={onClose}
      noPadding
      className="flex flex-col md:w-3/4 xl:w-1/2 h-4/6 overflow-y-auto p-6 pb-10 xl:pb-20 rounded-lg"
    >
      <Tabs
        defaultValue="assistant"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value)}
        className="w-full flex flex-col gap-4"
        orientation="vertical"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="assistant" className="w-full">
            <Cpu size={16} className="mr-2" /> My Assistant
          </TabsTrigger>
          {/*  <TabsTrigger value="models" className="w-full">
            <Sparkles size={16} className="mr-2" />
            Model
          </TabsTrigger> */}
          <TabsTrigger value="filters" className="w-full">
            <Filter size={16} className="mr-2" /> Filters
          </TabsTrigger>
        </TabsList>
        <TabsContent value="assistant" className="!mt-0">
          <div>
            <AssistantsTab
              availableAssistants={availableAssistants}
              llmProviders={llmProviders}
              selectedAssistant={selectedAssistant}
              onSelect={(assistant) => {
                setSelectedAssistant(assistant);
                onClose();
              }}
            />
          </div>
        </TabsContent>
        {/* <TabsContent value="models">
          <LlmTab
            chatSessionId={chatSessionId}
            llmOverrideManager={llmOverrideManager}
            currentAssistant={selectedAssistant}
          />
        </TabsContent> */}
        <TabsContent value="filters">
          <FiltersTab filterManager={filterManager} />
        </TabsContent>
      </Tabs>
    </Modal>
  );
}
