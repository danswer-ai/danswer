import { ReactNode } from "react";

export default function Citation({
  children,
  link,
}: {
  link?: string;
  children: JSX.Element | string | null | ReactNode;
}) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    console.log("link");
    console.log(link);
    if (link) {
      window.open(link, "_blank");
    }
  };

  return (
    <a
      onClick={() => (link ? window.open(link, "_blank") : undefined)}
      className="cursor-pointer inline ml-1 align-middle"
    >
      <span className="group relative -top-1 text-sm text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
        <span
          className="inline-flex group-hover:bg-neutral-200 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-300"
          data-number="3"
        >
          {children && children?.toString().split("[")[1].split("]")[0]}
        </span>
      </span>
    </a>

    // return (

    //     <button onClick={()=> window.open(link)} className="cursor-pointer inline ml-1 align-middle">
    //         <span className="group relative -top-1 text-sm  text-gray-500 dark:text-gray-400 selection:bg-indigo-300 selection:text-black dark:selection:bg-indigo-900 dark:selection:text-white">
    //             <span
    //                 className="inline-flex group-hover:bg-neutral-200 items-center justify-center h-4 min-w-4 px-1 text-center text-xs rounded-full border border-gray-400 ring-1 ring-gray-400 divide-gray-300 dark:divide-gray-700 dark:ring-gray-700 dark:border-gray-700 transition duration-300  "
    //                 data-number="3"
    //             >
    //                 {children && children?.toString().split("[")[1].split("]")[0]}

    //             </span>
    //         </span>

    //     </button>
    // <a className="p-1 flex-none rounded rounded-full inline-block bg-blue-500 text-xs mb-1  mx-1">
    //     {children && children?.toString().split("[")[1].split("]")[0]}
    // </a>
  );
}
