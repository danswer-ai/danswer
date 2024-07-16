"use client";

import { useState, useEffect } from "react";

type OperatingSystem = "Windows" | "Mac" | "Other";

const useOperatingSystem = (): OperatingSystem => {
  const [os, setOS] = useState<OperatingSystem>("Other");

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes("win")) {
      setOS("Windows");
    } else if (userAgent.includes("mac")) {
      setOS("Mac");
    }
  }, []);

  return os;
};

const KeyboardSymbol = () => {
  const os = useOperatingSystem();

  if (os === "Windows") {
    return <span>⊞</span>;
  } else if (os === "Mac") {
    return <span>⌘</span>;
  } else {
    return <span>⌘</span>;
  }
};

export default KeyboardSymbol;
