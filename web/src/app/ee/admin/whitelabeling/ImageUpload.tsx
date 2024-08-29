import { SubLabel } from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEffect, useState } from "react";
import Dropzone from "react-dropzone";

export function ImageUpload({
  selectedFile,
  setSelectedFile,
}: {
  selectedFile: File | null;
  setSelectedFile: (file: File) => void;
}) {
  const [tmpImageUrl, setTmpImageUrl] = useState<string>("");

  useEffect(() => {
    if (selectedFile) {
      setTmpImageUrl(URL.createObjectURL(selectedFile));
    } else {
      setTmpImageUrl("");
    }
  }, [selectedFile]);

  const [dragActive, setDragActive] = useState(false);
  const { popup, setPopup } = usePopup();

  return (
    <>
      {popup}
      <Dropzone
        onDrop={(acceptedFiles) => {
          if (acceptedFiles.length !== 1) {
            setPopup({
              type: "error",
              message: "Only one file can be uploaded at a time",
            });
          }

          setTmpImageUrl(URL.createObjectURL(acceptedFiles[0]));
          setSelectedFile(acceptedFiles[0]);
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
              <b className="text-emphasis">
                Drag and drop a .png or .jpg file, or click to select a file!
              </b>
            </div>

            {tmpImageUrl && (
              <div className="mt-4 mb-8">
                <SubLabel>Uploaded Image:</SubLabel>
                <Image
                  src={tmpImageUrl}
                  alt="uploaded-image"
                  className="mt-4 max-w-xs max-h-64"
                  width={256}
                  height={256}
                />
              </div>
            )}
          </section>
        )}
      </Dropzone>
    </>
  );
}
