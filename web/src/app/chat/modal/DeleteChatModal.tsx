/* import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";

export const DeleteChatModal = ({
  chatSessionName,
  onSubmit,
}: {
  chatSessionName: string;
  onSubmit: () => void;
}) => {
  return (
    <Dialog>
      <DialogTrigger>
        <CustomTooltip
          trigger={
            <div className="hover:bg-background-inverted/10 p-1 rounded">
              <Trash size={16} />
            </div>
          }
        >
          Delete
        </CustomTooltip>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Delete chat?</DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          <p className="mb-4">
            Click below to confirm that you want to delete{" "}
            <b>&quot;{chatSessionName.slice(0, 30)}&quot;</b>
          </p>
          <div className="flex">
            <div className="mx-auto pt-2">
              <Button variant="destructive" onClick={onSubmit}>
                <Trash size={16} className="my-auto" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; */
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";
import { CustomModal } from "@/components/CustomModal";

export const DeleteChatModal = ({
  chatSessionName,
  onSubmit,
}: {
  chatSessionName: string;
  onSubmit: () => void;
}) => {
  return (
    <CustomModal
      trigger={
        <div className="hover:bg-background-inverted/10 p-1 rounded">
          <Trash size={16} />
        </div>
      }
      title="Delete chat?"
    >
      <div>
        <div className="pt-2">
          <p className="mb-4">
            Click below to confirm that you want to delete{" "}
            <b>&quot;{chatSessionName.slice(0, 30)}&quot;</b>
          </p>
          <div className="flex">
            <div className="mx-auto pt-2">
              <Button variant="destructive" onClick={onSubmit}>
                <Trash size={16} className="my-auto" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CustomModal>
  );
};
