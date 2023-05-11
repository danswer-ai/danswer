import React, { useState, useEffect } from "react";
import "./thinking.css";

interface ThinkingAnimationProps {
  text?: string;
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  text,
}) => {
  const [dots, setDots] = useState("...");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => {
        switch (prevDots) {
          case ".":
            return "..";
          case "..":
            return "...";
          case "...":
            return ".";
          default:
            return "...";
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="thinking-animation flex">
      <div className="mx-auto">
        {text || "Thinking"}
        <span className="dots">{dots}</span>
      </div>
    </div>
  );
};
