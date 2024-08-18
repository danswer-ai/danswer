import { useState } from "react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function SectionHeader({
  children,
  includeMargin = true,
}: {
  children: string | JSX.Element;
  includeMargin?: boolean;
}) {
  return (
    <div
      className={"font-bold text-xl my-auto" + (includeMargin ? " mb-4" : "")}
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
        className="flex hover:bg-hover-light rounded cursor-pointer p-2 w-full"
        onClick={() => setIsHidden(!isHidden)}
      >
        <SectionHeader includeMargin={false}>{sectionTitle}</SectionHeader>
        <div className="ml-auto">
          {isHidden ? (
            <FiChevronRight size={24} />
          ) : (
            <FiChevronDown size={24} />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="mx-2 mt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
