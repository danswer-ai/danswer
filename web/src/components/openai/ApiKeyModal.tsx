"use client";

import { useState, useEffect } from "react";
import { ApiKeyForm } from "./ApiKeyForm";

export const ApiKeyModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/manage/admin/genai-api-key/validate", {
      method: "HEAD",
    }).then((res) => {
      // show popup if either the API key is not set or the API key is invalid
      if (!res.ok && (res.status === 404 || res.status === 400)) {
        setIsOpen(true);
      }
    });
  }, []);

  return (
    <div>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-gray-800 p-6 rounded border border-gray-700 shadow-lg relative w-1/2 text-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2.5 font-bold">
              Can&apos;t find a valid registered OpenAI API key. Please provide
              one to be able to ask questions! Or if you&apos;d rather just look
              around for now,{" "}
              <strong
                onClick={() => setIsOpen(false)}
                className="text-blue-300 cursor-pointer"
              >
                skip this step
              </strong>
              .
            </p>
            <ApiKeyForm
              handleResponse={(response) => {
                if (response.ok) {
                  setIsOpen(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
