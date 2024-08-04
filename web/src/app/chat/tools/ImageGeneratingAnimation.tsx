export default function GeneratingImage() {
  return (
    <div className="object-cover object-center border border-neutral-200 bg-neutral-100 items-center justify-center overflow-hidden flex rounded-lg w-96 h-96 transition-opacity duration-300 opacity-100">
      <div className="m-auto relative flex">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full generating-spin border-t-gray-800"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-neutral-500 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
