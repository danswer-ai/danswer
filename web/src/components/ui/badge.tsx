import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "flex items-center rounded-full border px-2.5 !py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-dark-900 gap-1 max-w-[220px] w-fit truncate",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-500 text-inverted",
        secondary: "border-transparent bg-gray-200 text-default",

        // Indexing Status
        notStarted: "border-transparent bg-gray-500 text-white", // #B0B0B0
        inProgress: "border-transparent bg-blue-800 text-white", // #007BFF
        success: "border-transparent bg-green-500 text-white", // #28A745
        failed: "border-transparent bg-red-500 text-white", // #DC3545
        completedWithErrors: "border-transparent bg-orange-500 text-white", // #FD7E14

        // Data Source Status
        paused: "border-transparent bg-gray-600 text-white", // #6C757D
        deleting: "border-transparent bg-red-600 text-white", // #C82333
        active: "border-transparent bg-green-600 text-white", // #218838
        scheduled: "border-transparent bg-blue-400 text-white", // #17A2B8
        indexing: "border-transparent bg-blue-800 text-white", // #0056B3

        // Other Utility Variants
        warning: "border-transparent bg-warning-500 text-dark-900",
        destructive: "border-transparent bg-destructive-500 text-dark-900",
        outline: "text-foreground",
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

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
