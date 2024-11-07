import { ChevronDown, ChevronRight } from "lucide-react";
import React from "react";

interface AdvancedOptionsToggleProps {
  showAdvancedOptions: boolean;
  setShowAdvancedOptions: (show: boolean) => void;
}

export function AdvancedOptionsToggle({
  showAdvancedOptions,
  setShowAdvancedOptions,
}: AdvancedOptionsToggleProps) {
  return (
    <div>
      <button
        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        className="text-sm text-text-950 hover:text-text-500 pt-2 flex items-center gap-1 font-medium"
        type="button"
      >
        {showAdvancedOptions ? (
          <ChevronDown size={16} />
        ) : (
          <ChevronRight size={16} />
        )}{" "}
        Advanced Options
      </button>
    </div>
  );
}
