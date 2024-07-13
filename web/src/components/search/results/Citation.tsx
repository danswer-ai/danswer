import { CustomTooltip } from "@/components/tooltip/CustomTooltip";
import { ReactNode } from "react";

// NOTE: This is the preivous version of the citations which works just fine
export function Citation({
  children,
  link,
}: {
  link?: string;
  children: JSX.Element | string | null | ReactNode;
}) {
  const innerText =
    children && children?.toString().split("[")[1].split("]")[0];

  if (link != "") {
    return (
      <a
        onClick={() => (link ? window.open(link, "_blank") : undefined)}
        className="cursor-pointer inline ml-1 align-middle"
      >
        <span className="group relative -top-1 text-sm text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
          <span
            className="inline-flex bg-background-subtle group-hover:bg-background-stronger items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
            data-number="3"
          >
            {innerText}
          </span>
        </span>
      </a>
    );
  } else {
    return (
      <CustomTooltip content={<div>This doc doesn&apos;t have a link!</div>}>
        <div className="cursor-help leading-none inline ml-1 align-middle">
          <span className="group relative -top-1 text-sm text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
            <span
              className="inline-flex bg-background-subtle group-hover:bg-background-stronger items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
              data-number="3"
            >
              {innerText}
            </span>
          </span>
        </div>
      </CustomTooltip>
    );
  }
}
