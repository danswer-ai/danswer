"use client";
import { useState } from "react";
import { HistorySidebar } from "../chat/sessionSidebar/HistorySidebar";

export default function asdf() {
  const toggleSidebar = () => {
    return;
  };
  const [toggledSidebar, setToggledSidebar] = useState();
  return (
    <div className="flex  relative bg-background text-default ">
      <div
        className={`
            flex-none
            absolute
            left-0
            z-20

            sidebar
            bg-background-100
            h-screen
            transition-all
            bg-opacity-80
            duration-300
            ease-in-out

opacity-100 w-[300px] translate-x-0
                    }`}
      >
        <div className="w-full relative">
          <div className="max-w-sm">
            <HistorySidebar
              page="chat"
              toggleSidebar={toggleSidebar}
              toggled={toggledSidebar}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
