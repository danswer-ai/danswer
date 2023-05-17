import React, { useState, useEffect } from "react";
import "./loading.css";

interface LoadingAnimationProps {
  text?: string;
  size?: "text-sm" | "text-md";
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  text,
  size,
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
    <div className="loading-animation flex">
      <div className={"mx-auto flex" + size ? ` ${size}` : ""}>
        {text === undefined ? "Thinking" : text}
        <span className="dots">{dots}</span>
      </div>
    </div>
  );
};
