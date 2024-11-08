import { cn } from "@/lib/utils";

// Used for all admin page sections
export default function CardSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "p-6  shadow-sm rounded-lg border border-border-medium",
        className
      )}
    >
      {children}
    </div>
  );
}
