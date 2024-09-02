import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

interface CustomModalProps {
  children: React.ReactNode;
  trigger: string | React.ReactNode;
  onClose?: () => void;
  open?: boolean;
}

export function CustomModal({
  children,
  trigger,
  onClose,
  open,
}: CustomModalProps) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
