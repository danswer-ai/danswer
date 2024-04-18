export const StockSkeleton = () => {
  return (
    <div className="p-4 rounded-xl bg-zinc-950 text-green-400 border border-zinc-900">
      <div className="float-right inline-block px-2 py-1 rounded-full bg-white/10 text-xs text-transparent w-fit bg-zinc-700">
        xxxxxxx
      </div>
      <div className="text-lg text-transparent w-fit bg-zinc-700 rounded-md mb-1">
        xxxx
      </div>
      <div className="text-3xl font-bold text-transparent w-fit bg-zinc-700 rounded-md">
        xxxx
      </div>
      <div className="text text-xs text-transparent mt-1 bg-zinc-700 w-fit rounded-md">
        xxxxxx xxx xx xxxx xx xxx
      </div>

      <div className="-mx-4 relative cursor-col-resize">
        <div style={{ height: 146 }}></div>
      </div>
    </div>
  );
};
