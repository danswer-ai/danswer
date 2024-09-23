"use client";

import BulkAdd from "@/components/admin/users/BulkAdd";
import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { mutate } from "swr";

export const AddUserButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const onSuccess = () => {
    mutate(
      (key) => typeof key === "string" && key.startsWith("/api/manage/users")
    );
    setIsModalOpen(false);
    toast({
      title: "Success",
      description: "Users invited!",
      variant: "success",
    });
  };
  const onFailure = async (res: Response) => {
    const error = (await res.json()).detail;
    toast({
      title: "Error",
      description: `Failed to invite users - ${error}`,
      variant: "destructive",
    });
  };

  return (
    <CustomModal
      title="Bulk Add Users"
      onClose={() => setIsModalOpen(false)}
      open={isModalOpen}
      trigger={
        <Button onClick={() => setIsModalOpen(true)}>Invite People</Button>
      }
    >
      <div className="flex flex-col gap-y-3 pt-4">
        <Label>
          Add the email addresses to import, separated by whitespaces.
        </Label>
        <BulkAdd onSuccess={onSuccess} onFailure={onFailure} />
      </div>
    </CustomModal>
  );
};
