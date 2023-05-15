import React, { useState, useEffect } from "react";
import "./loading.css";

interface LoadingAnimationProps {
  text?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ text }) => {
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
      <div className="mx-auto">
        {text === undefined ? "Thinking" : text}
        <span className="dots">{dots}</span>
      </div>
    </div>
  );
};
