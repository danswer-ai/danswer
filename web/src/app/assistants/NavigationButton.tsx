import { Button } from "@/components/ui/button";

export function NavigationButton({
  children,
}: {
  children: JSX.Element | string;
}) {
  return (
    <Button variant="outline" className="w-full">
      {children}
    </Button>
  );
}
