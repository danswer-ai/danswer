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
}: {
  children: React.ReactNode;
  trigger: string | React.ReactNode;
  align?: "start" | "end" | "center";
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{trigger}</TooltipTrigger>
        <TooltipContent align={align}>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
