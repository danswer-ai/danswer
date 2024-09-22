import React, { useState, useEffect } from "react";
import { diffLines, Change } from "diff";

const StreamingDiffViewer = ({
  originalText,
  aiText,
}: {
  originalText: string;
  aiText: string;
}) => {
  const [diffResult, setDiffResult] = useState<Change[]>([]);

  useEffect(() => {
    const originalLines = originalText.split("\n");
    const aiLines = aiText.split("\n");

    const diff = diffLines(originalLines.join("\n"), aiLines.join("\n"));
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
          <pre key={index} className={className}>
            {part.value}
          </pre>
        );
      })}
    </div>
  );
};

export default StreamingDiffViewer;
