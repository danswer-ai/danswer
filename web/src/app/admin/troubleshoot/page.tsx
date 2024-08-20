"use client";
import {
  Button,
} from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { GearIcon } from "@/components/icons/icons";



const Page = () => {
    // Generate Logs endpoint
    const getLogs = async () => {
      await fetch("/api/manage/admin/troubleshoot/logs", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(
          new Blob([blob]),
        );
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `logs.zip`,
        );
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
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
    </div>
  );
};

export default Page;
