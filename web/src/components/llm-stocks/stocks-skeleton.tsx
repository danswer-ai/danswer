export const StocksSkeleton = () => {
  return (
    <div className="flex flex-col sm:flex-row text-sm gap-2 mb-4 overflow-y-scroll pb-4">
      <div className="bg-zinc-900 text-left p-2 rounded-lg flex flex-row gap-2 cursor-pointer hover:bg-zinc-800 h-[60px] sm:w-[208px] w-full"></div>
      <div className="bg-zinc-900 text-left p-2 rounded-lg flex flex-row gap-2 cursor-pointer hover:bg-zinc-800 h-[60px] sm:w-[208px] w-full"></div>
      <div className="bg-zinc-900 text-left p-2 rounded-lg flex flex-row gap-2 cursor-pointer hover:bg-zinc-800 h-[60px] sm:w-[208px] w-full"></div>
    </div>
  );
};
