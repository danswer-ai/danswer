import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export function SectionHeader({
  children,
  includeMargin = true,
}: {
  children: string | JSX.Element;
  includeMargin?: boolean;
}) {
  return (
    <div
      className={
        "font-bold text:lg md:text-xl my-auto" + (includeMargin ? " mb-4" : "")
      }
    >
      {children}
    </div>
  );
}

export function HidableSection({
  children,
  sectionTitle,
}: {
  children: string | JSX.Element;
  sectionTitle: string | JSX.Element;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between hover:bg-hover-light rounded-regular cursor-pointer p-2 w-full">
        <SectionHeader includeMargin={false}>{sectionTitle}</SectionHeader>
        {isOpen ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mx-2 mt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
