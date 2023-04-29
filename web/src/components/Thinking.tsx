import React, { useState, useEffect } from "react";
import "./thinking.css";

export const ThinkingAnimation: React.FC = () => {
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
    <div className="thinking-animation">
      Thinking<span className="dots">{dots}</span>
    </div>
  );
};
