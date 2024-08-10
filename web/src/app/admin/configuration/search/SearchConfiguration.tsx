"use client";

import { useState } from "react";
import { Title, Text, Select, SelectItem, Switch } from "@tremor/react";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";

export function SearchConfiguration() {
  const [rerankingOption, setRerankingOption] = useState("cohere");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [llmChunkFilter, setLlmChunkFilter] = useState(false);
  const [queryExpansion, setQueryExpansion] = useState(false);

  return (
    <>
      <Title className="mb-2">Reranking Options</Title>
      <Text className="mb-4">
        Choose how you want to rerank search results for better accuracy.
      </Text>
      <Select
        value={rerankingOption}
        onValueChange={setRerankingOption}
        className="max-w-xs"
      >
        <SelectItem value="none">No reranking</SelectItem>
        <SelectItem value="local">Local reranking</SelectItem>
        <SelectItem value="cohere">
          Cohere reranking (default if Cohere is used)
        </SelectItem>
      </Select>

      <Title className="mb-2 mt-6">Advanced Options</Title>
      <AdvancedOptionsToggle
        showAdvancedOptions={showAdvancedOptions}
        setShowAdvancedOptions={setShowAdvancedOptions}
      />

      {showAdvancedOptions && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="llm-chunk-filter"
              name="llm-chunk-filter"
              checked={llmChunkFilter}
              onChange={setLlmChunkFilter}
            />
            <Text>LLM chunk filter</Text>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="query-expansion"
              name="query-expansion"
              checked={queryExpansion}
              onChange={setQueryExpansion}
            />
            <Text>Query expansion</Text>
          </div>
        </div>
      )}
    </>
  );
}
