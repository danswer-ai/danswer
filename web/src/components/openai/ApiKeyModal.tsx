"use client";

import { useState, useEffect } from "react";
import { ApiKeyForm } from "./ApiKeyForm";
import { Modal } from "../Modal";
import { Text } from "@tremor/react";

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

  if (!isOpen) {
    return null;
  }

  return (
    <Modal className="max-w-4xl" onOutsideClick={() => setIsOpen(false)}>
      <div>
        <div>
          <Text className="mb-2.5">
            Can&apos;t find a valid registered OpenAI API key. Please provide
            one to be able to ask questions! Or if you&apos;d rather just look
            around for now,{" "}
            <strong
              onClick={() => setIsOpen(false)}
              className="text-link cursor-pointer"
            >
              skip this step
            </strong>
            .
          </Text>
          <ApiKeyForm
            handleResponse={(response) => {
              if (response.ok) {
                setIsOpen(false);
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );
};
