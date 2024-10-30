import { cn } from "@/lib/utils";

interface CalloutProps {
  icon?: string;
  children?: React.ReactNode;
  type?: "default" | "warning" | "danger" | "notice";
  className?: string;
}

export function Callout({
  children,
  icon,
  type = "default",
  title,
  className,
  ...props
}: CalloutProps & { title?: string }) {
  return (
    <div
      className={cn(
        "my-6 flex items-start rounded-md border border-l-4 p-4",
        className,
        {
          "border-red-900 bg-red-50": type === "danger",
          "border-yellow-900 bg-yellow-50": type === "warning",
          "border-blue-900 bg-blue-50": type === "notice",
        }
      )}
      {...props}
    >
      {icon && <span className="mr-4 text-2xl">{icon}</span>}
      <div>
        {title && <div className="font-medium mb-1">{title}</div>}
        {children}
      </div>
    </div>
  );
}
