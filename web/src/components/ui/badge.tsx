import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 dark:border-neutral-800 dark:focus:ring-neutral-300",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-900 text-neutral-50 hover:bg-neutral-900/80 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-50/80",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800/80",
        destructive:
          "border-transparent bg-red-500 text-neutral-50 hover:bg-red-500/80 dark:bg-red-900 dark:text-neutral-50 dark:hover:bg-red-900/80",
        outline: "text-neutral-950 dark:text-neutral-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}
function Badge({
  className,
  variant,
  color,
  icon: Icon,
  size = "sm",
  ...props
}: BadgeProps & {
  icon?: React.ElementType;
  size?: "sm" | "md";
  color?:
    | "red"
    | "yellow"
    | "green"
    | "amber"
    | "fuchsia"
    | "gray"
    | "blue"
    | "orange"
    | "purple";
}) {
  const colorClasses = {
    red: "bg-red-100 text-red-500 hover:bg-red-100/90 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-900/90",
    yellow:
      "bg-yellow-100 text-yellow-500 hover:bg-yellow-100/90 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-900/90",
    green:
      "bg-green-100 text-green-500 hover:bg-green-100/90 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-900/90",
    amber:
      "bg-amber-100 text-amber-500 hover:bg-amber-100/90 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-900/90",
    fuchsia:
      "bg-fuchsia-100 text-fuchsia-500 hover:bg-fuchsia-100/90 dark:bg-fuchsia-900 dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/90",
    gray: "bg-gray-100 text-gray-500 hover:bg-gray-100/90 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-900/90",
    blue: "bg-blue-100 text-blue-500 hover:bg-blue-100/90 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-900/90",
    orange:
      "bg-orange-100 text-orange-500 hover:bg-orange-100/90 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-900/90",
    purple:
      "bg-purple-100 text-purple-500 hover:bg-purple-100/90 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-900/90",
  };

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        color ? colorClasses[color] : null,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      )}
      {props.children}
    </div>
  );
}

export { Badge, badgeVariants };
