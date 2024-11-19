"use client";

import { usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlackTokensForm } from "./SlackTokensForm";

export const NewSlackBotForm = ({}: {}) => {
  const [formValues] = useState({
    name: "",
    enabled: true,
    bot_token: "",
    app_token: "",
  });
  const { popup, setPopup } = usePopup();
  const router = useRouter();

  return (
    <div>
      {popup}
      <div className="p-4">
        <SlackTokensForm
          isUpdate={false}
          initialValues={formValues}
          setPopup={setPopup}
          router={router}
        />
      </div>
    </div>
  );
};
