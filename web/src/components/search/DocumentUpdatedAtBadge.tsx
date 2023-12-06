import { timeAgo } from "@/lib/time";

export function DocumentUpdatedAtBadge({ updatedAt }: { updatedAt: string }) {
  return (
    <div className="flex flex-wrap gap-x-2 mt-1">
      <div
        className={`
    text-xs 
    text-strong
    text-gray-200 
    bg-hover 
    rounded-full 
    px-1
    py-0.5 
    w-fit 
    my-auto 
    select-none 
    mr-2`}
      >
        <div className="mr-1 my-auto flex">
          {"Updated " + timeAgo(updatedAt)}
        </div>
      </div>
    </div>
  );
}
