import React, { useState, useEffect, SetStateAction, Dispatch } from "react";
import { diffChars, Change } from "diff";

const StreamingDiffViewer = ({
  text,
  aiText,
  setText,
  resetAIText,
  finishedStreaming,
  highlightedLines,
  setHighlightedLines,
}: {
  text: string;
  aiText: string;
  setText: (text: string) => void;
  resetAIText: () => void;
  finishedStreaming: boolean;
  highlightedLines: number[];
  setHighlightedLines: Dispatch<SetStateAction<number[]>>;
}) => {
  const [diffResult, setDiffResult] = useState<Change[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState(text);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (aiText) {
      const diff = diffChars(text, aiText);
      setDiffResult(diff);
    } else {
      setDiffResult([]);
    }
  }, [text, aiText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleAccept = () => {
    setText(aiText);
    resetAIText();
  };

  const handleReject = () => {
    resetAIText();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleMouseUp = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const textBeforeSelection = text.slice(0, start);
      const startLine = textBeforeSelection.split("\n").length;
      const selectedText = text.slice(start, end);
      const endLine = startLine + selectedText.split("\n").length - 1;

      const newHighlightedLines = Array.from(
        { length: endLine - startLine + 1 },
        (_, i) => startLine + i
      );
      setHighlightedLines(newHighlightedLines);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="font-mono whitespace-pre-wrap p-3 rounded mb-4">
        {aiText ? (
          <div className="p-2">
            {diffResult.map((part, index) => {
              let className = "";
              if (part.added) {
                className = "bg-green-50 text-green-700";
              } else if (part.removed) {
                className = "bg-red-50 text-red-700 line-through";
              }

              return (
                <span key={index} className={className}>
                  {part.value}
                </span>
              );
            })}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextareaChange}
            onMouseUp={handleMouseUp}
            className="w-full p-2 border-none outline-none resize-none focus:ring-1 focus:ring-gray-300 rounded"
            placeholder="Enter your text here..."
            style={{ minHeight: "32px", overflow: "hidden" }}
          />
        )}
      </div>
      {aiText && (
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleReject}
            className="px-4 py-1 bg-white text-black border border-gray-300 rounded hover:bg-gray-100 transition duration-150"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1 bg-black text-white rounded hover:bg-gray-800 transition duration-150"
          >
            Accept
          </button>
        </div>
      )}
      <div>Highlighted Lines: {highlightedLines.join(", ")}</div>
    </div>
  );
};

export default StreamingDiffViewer;
