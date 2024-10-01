import React, {
  useState,
  ReactNode,
  useCallback,
  useMemo,
  memo,
  useRef,
} from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

const CODE_BLOCK_PADDING_TYPE = { padding: "1rem" };

interface CodeBlockProps {
  className?: string | undefined;
  children?: ReactNode;
  codeText: string;
}

export const CodeBlock = memo(function CodeBlock({
  className = "",
  children,
  codeText,
}: CodeBlockProps) {
  console.log(children);
  const count = useRef(0);
  console.log("code", count.current);
  count.current++;
  const [copied, setCopied] = useState(false);

  const language = useMemo(() => {
    return className
      .split(" ")
      .filter((cls) => cls.startsWith("language-"))
      .map((cls) => cls.replace("language-", ""))
      .join(" ");
  }, [className]);

  const handleCopy = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!codeText) {
        return;
      }

      navigator.clipboard.writeText(codeText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [codeText]
  );

  if (!language) {
    if (typeof children === "string") {
      return <code className={className}>{children}</code>;
    }

    return (
      <pre style={CODE_BLOCK_PADDING_TYPE}>
        <code className={`text-sm ${className}`}>{children}</code>
      </pre>
    );
  }

  return (
    <div className="overflow-x-hidden">
      <div className="flex mx-3 py-2 text-xs">
        {language}
        {codeText && (
          <div
            className="ml-auto cursor-pointer select-none"
            onMouseDown={handleCopy}
          >
            {copied ? (
              <div className="flex items-center space-x-2">
                <FiCheck size={16} />
                <span>Copied!</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <FiCopy size={16} />
                <span>Copy code</span>
              </div>
            )}
          </div>
        )}
      </div>
      <pre className="overflow-x-scroll" style={{ padding: "1rem" }}>
        <code className={`text-xs overflow-x-auto `}>{children}</code>
      </pre>
    </div>
  );
});
