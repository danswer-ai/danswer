import React, { useState, useEffect } from "react";
import { diffChars, Change } from "diff";

const StreamingDiffViewer = ({
  originalText,
  aiText,
}: {
  originalText: string;
  aiText: string;
}) => {
  const [diffResult, setDiffResult] = useState<Change[]>([]);

  useEffect(() => {
    const diff = diffChars(originalText, aiText);
    setDiffResult(diff);
  }, [originalText, aiText]);

  return (
    <div className="font-mono whitespace-pre-wrap">
      {diffResult.map((part, index) => {
        const className = part.added
          ? "bg-green-100"
          : part.removed
            ? "bg-red-100 line-through"
            : "";

        return (
          <span key={index} className={className}>
            {part.value}
          </span>
        );
      })}
    </div>
  );
};

export default StreamingDiffViewer;
