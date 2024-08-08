import { CustomTooltip } from "@/components/tooltip/CustomTooltip";
import { ReactNode } from "react";

// NOTE: This is the preivous version of the citations which works just fine
export function Citation({
  children,
  link,
  index,
}: {
  link?: string;
  children?: JSX.Element | string | null | ReactNode;
  index?: number;
}) {
  const innerText = children
    ? children?.toString().split("[")[1].split("]")[0]
    : index;

  if (link != "") {
    return (
      <CustomTooltip
        citation
        content={<div className="inline-block p-0 m-0 truncate">{link}</div>}
      >
        <a
          onMouseDown={() => (link ? window.open(link, "_blank") : undefined)}
          className="cursor-pointer inline ml-1 font-sans align-middle inline-block text-sm text-blue-500 cursor-help leading-none inline ml-1 align-middle"
        >
          [{innerText}]
        </a>
      </CustomTooltip>
    );
  } else {
    return (
      <CustomTooltip content={<div>This doc doesn&apos;t have a link!</div>}>
        <div className="inline-block text-sm font-sans text-blue-500 cursor-help leading-none inline ml-1 align-middle">
          [{innerText}]
        </div>
      </CustomTooltip>
    );
  }
}
