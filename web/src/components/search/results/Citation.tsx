import Popup from "@/app/chat/sessionSidebar/Popup";
import { Popover } from "@/components/popover/Popover";
import { DanswerDocument } from "@/lib/search/interfaces";
import { ReactNode, useState } from "react";

export const Tooltip = ({
  content,
  children,
  large,
  light,
  line,
}: {
  content: string | ReactNode;
  children: JSX.Element;
  large?: boolean;
  line?: boolean;
  light?: boolean;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className="relative leading-none inline-block">
      <span
        className="underline inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </span>
      {isVisible &&
        (line ? (
          <div
            className={`absolute  z-10 ${large ? "w-96" : "max-w-64"} mt-2 text-sm text-white ${light ? "p-1 bg-neutral-200" : "p-2 bg-neutral-800"} bg rounded-lg shadow-lg`}
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {content}
          </div>
        ) : (
          <div
            className={`absolute  z-10 flex ${large ? "w-96" : "w-40"} mt-2 text-sm text-white ${light ? "p-1 bg-neutral-200" : "p-2 bg-neutral-800"} bg rounded-lg shadow-lg`}
          >
            {content}
          </div>
        ))}
    </span>
  );
};

export function Citation({
  children,
  link,
  doc,
}: {
  doc?: DanswerDocument;
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
            className="inline-flex bg-neutral-200 group-hover:bg-neutral-300 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
            data-number="3"
          >
            {innerText}
          </span>
        </span>
      </a>
    );
  } else {
    const Description = () => {
      return (
        <>
          <p>{doc?.link}</p>
        </>
      );
    };
    return (
      <Popup content={(close) => <Description />}>
        <div className="cursor-pointer leading-none inline ml-1 align-middle">
          <span className="group relative -top-1 text-sm text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
            <span
              className="inline-flex bg-neutral-200 group-hover:bg-neutral-300 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
              data-number="3"
            >
              {innerText}
            </span>
          </span>
        </div>
      </Popup>
    );
  }
}

// NOTE: This is the preivous version of the citations which works just fine
export function PreviousCitation({
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
            className="inline-flex bg-neutral-200 group-hover:bg-neutral-300 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
            data-number="3"
          >
            {innerText}
          </span>
        </span>
      </a>
    );
  } else {
    return (
      <Tooltip content={<div>This doc doesn&apos;t have a link!</div>}>
        <div className="cursor-help leading-none inline ml-1 align-middle">
          <span className="group relative -top-1 text-sm text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
            <span
              className="inline-flex bg-neutral-200 group-hover:bg-neutral-300 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border-1 border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-150"
              data-number="3"
            >
              {innerText}
            </span>
          </span>
        </div>
      </Tooltip>
    );
  }
}
