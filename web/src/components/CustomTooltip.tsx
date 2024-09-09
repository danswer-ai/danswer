import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function CustomTooltip({
  children,
  trigger,
  align = "center",
  side = "top",
  delayDuration = 300,
  style,
  asChild,
}: {
  children: React.ReactNode;
  trigger: string | React.ReactNode;
  align?: "start" | "end" | "center";
  side?: "right" | "bottom" | "left" | "top";
  delayDuration?: number;
  style?: string;
  asChild?: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild={asChild}>{trigger}</TooltipTrigger>
        <TooltipContent
          align={align}
          side={side}
          className={`!z-modal ${style}`}
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
