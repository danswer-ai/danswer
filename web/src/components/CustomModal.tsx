import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface CustomModalProps {
  children: React.ReactNode;
  trigger: string | React.ReactNode;
  onClose?: () => void;
  open?: boolean;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
}

export function CustomModal({
  children,
  trigger,
  onClose,
  open,
  title,
  description,
}: CustomModalProps) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}
