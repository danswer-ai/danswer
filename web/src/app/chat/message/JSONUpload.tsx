import React, { useState } from "react";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Button } from "@/components/Button";
import { uploadFile } from "@/app/admin/assistants/lib";

interface JSONUploadProps {
  onUploadSuccess: (jsonData: any) => void;
}

export const JSONUpload: React.FC<JSONUploadProps> = ({ onUploadSuccess }) => {
  const { popup, setPopup } = usePopup();
  const [credentialJsonStr, setCredentialJsonStr] = useState<
    string | undefined
  >();
  const [file, setFile] = useState<File | null>(null);

  const uploadJSON = async () => {
    if (!file) {
      setPopup({
        type: "error",
        message: "Please select a file to upload.",
      });
      return;
    }

    try {
      let parsedData;
      if (file.type === "application/json") {
        parsedData = JSON.parse(credentialJsonStr!);
      } else {
        parsedData = credentialJsonStr;
      }

      const response = await uploadFile(file);
      console.log(response);

      onUploadSuccess(parsedData);
      setPopup({
        type: "success",
        message: "File uploaded successfully!",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      setPopup({
        type: "error",
        message: `Failed to upload file - ${error}`,
      });
    }
  };
  // 155056ca-dade-4825-bac9-efe86e7bda54
  return (
    <div>
      {popup}
      <input
        className="mr-3 text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-background dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
        type="file"
        onChange={(event) => {
          if (!event.target.files) {
            return;
          }
          const file = event.target.files[0];
          setFile(file);
          const reader = new FileReader();

          reader.onload = function (loadEvent) {
            if (!loadEvent?.target?.result) {
              return;
            }
            const fileContents = loadEvent.target.result;
            setCredentialJsonStr(fileContents as string);
          };

          reader.readAsText(file);
        }}
      />
      <Button disabled={!credentialJsonStr} onClick={uploadJSON}>
        Upload JSON
      </Button>
    </div>
  );
};
