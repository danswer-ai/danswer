"use client";
import { useState } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { GearIcon } from "@/components/icons/icons";
import { Modal } from "@/components/Modal";

const Page = () => {
  const [logFiles, setLogFiles] = useState<null|string[]>(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const getLogs = async () => {
    const files = await fetch("/api/manage/admin/troubleshoot/logs", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    const data = await files.json()
    if(data?.files){
      setLogFiles(data.files)
      setSelectedFiles(data.files)
      setModalIsOpen(true)
    } else {
      setLogFiles(null)
    }
  };

  const downloadLogs = async () => {
    try {
      // TODO: Add in a spinner or skeleton to indicate work happening
      const response = await fetch("/api/manage/admin/troubleshoot/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedFiles),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "debug_files.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading logs:", error);
    }
  };

  const closeModal = () => {
    setModalIsOpen(false)
  }

  const handleCheckboxChange = (file: string) => {
    setSelectedFiles((prevSelectedFiles) => {
      if (prevSelectedFiles.includes(file)) {
        return prevSelectedFiles.filter((f) => f !== file);
      } else {
        return [...prevSelectedFiles, file];
      }
    });
  };

  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<GearIcon size={32} />}
        title="Troubleshoot"
      />
      <div>
        Download recent logs here. This can be useful for debugging.
      </div>
      <Button
        color="green"
        size="xs"
        className="mt-3"
        onClick={() => getLogs()}
      >
        Fetch Logs
      </Button>
      {modalIsOpen && (
        <Modal onOutsideClick={closeModal} className="flex justify-center w-3/4 h-3/4">
          <div className="flex-col justify-center w-full h-full">
            <Table className="flex-col justify-center w-full h-3/4">
              <TableHead>
                <TableHeaderCell>
                  Select File
                </TableHeaderCell>
                <TableHeaderCell>
                  File Name
                </TableHeaderCell>
              </TableHead>
              <TableBody>
              {logFiles && logFiles.map((file, index) => (
                <TableRow key={index}>
                  <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file)}
                    onChange={() => handleCheckboxChange(file)}
                  />
                  </TableCell>
                  <TableCell>
                    {file}
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
            <Button
              color="green"
              size="xs"
              className="mt-3 max-h-1/4"
              onClick={() => downloadLogs()}
            >
              Download Logs
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Page;
