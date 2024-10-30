import { cn } from "@/lib/utils";

export default function Italic({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("italic", className)}>{children}</p>;
}
