// StreamingDiffViewer.tsx

import React, { useState, useEffect } from "react";
import { diffLines, Change } from "diff";
import "./diff.css";

interface StreamingDiffViewerProps {
  originalText: string;
  aiText: string;
}

const StreamingDiffViewer: React.FC<StreamingDiffViewerProps> = ({
  originalText,
  aiText,
}) => {
  const [diffResult, setDiffResult] = useState<Change[]>([]);

  useEffect(() => {
    const originalLines = originalText.split("\n");
    const aiLines = aiText.split("\n");

    const diff = diffLines(originalLines.join("\n"), aiLines.join("\n"));
    setDiffResult(diff);
  }, [originalText, aiText]);

  return (
    <div className="code-diff">
      {diffResult.map((part, index) => {
        const className = part.added
          ? "line-added"
          : part.removed
            ? "line-removed"
            : "line-unchanged";

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
