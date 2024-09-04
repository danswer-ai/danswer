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
  defaultHidden = false,
  defaultOpen,
}: {
  children: string | JSX.Element;
  sectionTitle: string | JSX.Element;
  defaultHidden?: boolean;
  defaultOpen?: boolean;
}) {
  const [isHidden, setIsHidden] = useState(defaultHidden);

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger
        className="flex items-center justify-between hover:bg-hover-light rounded-regular cursor-pointer p-2 w-full"
        onClick={() => setIsHidden(!isHidden)}
      >
        <SectionHeader includeMargin={false}>{sectionTitle}</SectionHeader>

        {isHidden ? <ChevronRight size={24} /> : <ChevronDown size={24} />}
      </CollapsibleTrigger>

      <CollapsibleContent className="mx-2 mt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
