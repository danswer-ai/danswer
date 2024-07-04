import { Popover } from "@/components/popover/Popover";
import { ReactNode, useState } from "react";

const Tooltip = ({
  content,
  children,
}: {
  content: string | ReactNode;
  children: JSX.Element;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative  leading-none inline-block">
      <span
        className="underline inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </span>
      {isVisible && (
        <div className="absolute max-w-xs z-10 w-64 p-2 mt-2 text-sm text-white bg-neutral-800 rounded-lg shadow-lg">
          {content}
        </div>
      )}
    </span>
  );
};

export default function Citation({
  children,
  link,
}: {
  link?: string;
  children: JSX.Element | string | null | ReactNode;
}) {
  // const [citationVisible, setCitationVisible] = useState(false)

  console.log(link);
  if (link != "") {
    return (
      <a
        onClick={() => (link ? window.open(link, "_blank") : undefined)}
        className="cursor-pointer inline ml-1 align-middle"
      >
        <span className="group relative -top-1 text-sm text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
          <span
            className="inline-flex bg-neutral-200 group-hover:bg-neutral-300 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
            data-number="3"
          >
            {children && children?.toString().split("[")[1].split("]")[0]}
          </span>
        </span>
      </a>
    );
  } else {
    return (
      <Tooltip content={<div>This doc doesn't have a link!</div>}>
        <div className="leading-none inline ml-1 align-middle">
          <span className="group relative -top-1 text-sm text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
            <span
              className="inline-flex bg-neutral-200 group-hover:bg-neutral-300 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
              data-number="3"
            >
              {children && children?.toString().split("[")[1].split("]")[0]}
            </span>
          </span>
        </div>
      </Tooltip>

      // <Popover
      //   open={false}
      //   onOpenChange={() => null}
      //   side="top"
      //   align="start"
      //   sideOffset={5}
      //   alignOffset={10}
      //   content=

      //   popover={
      //     <p>
      //       This document does not have a link!
      //     </p>
      //   }
      // />
    );
  }
}
