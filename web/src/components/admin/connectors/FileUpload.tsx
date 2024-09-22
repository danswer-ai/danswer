import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FC, useState } from "react";
import React from "react";
import Dropzone from "react-dropzone";

interface FileUploadProps {
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  message?: string;
}

export const FileUpload: FC<FileUploadProps> = ({
  selectedFiles,
  setSelectedFiles,
  message,
}) => {
  const [dragActive, setDragActive] = useState(false);

  return (
    <div className="pb-6">
      <Dropzone
        onDrop={(acceptedFiles) => {
          setSelectedFiles(acceptedFiles);
          setDragActive(false);
        }}
        onDragLeave={() => setDragActive(false)}
        onDragEnter={() => setDragActive(true)}
      >
        {({ getRootProps, getInputProps }) => (
          <section>
            <div
              {...getRootProps()}
              className={`bg-background p-4 flex items-center gap-4 border w-fit rounded-regular shadow-sm ${
                dragActive ? " border-accent" : ""
              }`}
            >
              <input {...getInputProps()} />
              <Button>Upload</Button>
              <b className="">
                {message ||
                  "Drag and drop some files here, or click to select files"}
              </b>
            </div>
          </section>
        )}
      </Dropzone>

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <span className="font-semibold text-sm">Uploaded image:</span>
          <ul>
            {selectedFiles.map((file) => (
              <div key={file.name} className="flex items-center mt-2">
                {file.type.startsWith("image/") ? (
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="object-cover"
                    width={150}
                    height={150}
                  />
                ) : (
                  <p className="text-sm mr-2">{file.name}</p>
                )}
              </div>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
