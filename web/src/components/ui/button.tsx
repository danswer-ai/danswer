import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center gap-1.5 justify-center whitespace-nowrap rounded-regular text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-inverted hover:bg-primary-foreground focus-visible:ring-primary",
        destructive:
          "bg-destructive text-inverted hover:bg-destructive-foreground focus-visible:ring-destructive",
        outline:
          "border border-input-colored bg-background hover:bg-[#B0DEFF] hover:text-accent-foreground focus-visible:ring-input-colored",
        secondary:
          "bg-secondary text-inverted hover:bg-secondary-foreground focus-visible:ring-secondary",
        ghost:
          "hover:bg-light hover:text-accent-foreground focus-visible:ring-light",
        link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary",
        success:
          "bg-success text-inverted hover:bg-success-foreground focus-visible:ring-success",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 rounded-xs px-1",
        sm: "h-9 rounded-xs px-3",
        lg: "h-11 rounded-xs px-8",
        icon: "h-10 w-10",
        smallIcon: "py-1.5 px-[7px] rounded-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
