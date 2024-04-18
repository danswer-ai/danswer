export const EventsSkeleton = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 overflow-scroll py-4 -mt-2">
      <div className="flex flex-col p-4 bg-zinc-900 rounded-md max-w-96 flex-shrink-0 rounded-lg">
        <div className="text-sm text-transparent w-fit bg-zinc-700 rounded-md mb-1">
          {'xxxxx'}
        </div>
        <div className="text-transparent w-fit bg-zinc-700 rounded-md mb-1">
          {'xxxxxxxxxxx'}
        </div>
        <div className="text-transparent bg-zinc-700 rounded-md sm:w-[352px] w-auto h-[42px]"></div>
      </div>
    </div>
  );
};
