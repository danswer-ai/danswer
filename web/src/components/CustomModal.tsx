import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

export function CustomModal({
  children,
  trigger,
}: {
  children: React.ReactNode;
  trigger: string | React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
