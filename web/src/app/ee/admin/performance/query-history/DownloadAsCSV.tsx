import { FiDownload } from "react-icons/fi";

export function DownloadAsCSV() {
  return (
    <a
      href="/api/admin/query-history-csv"
      className="text-gray-300 flex ml-auto py-2 px-4 border border-gray-800 h-fit cursor-pointer hover:bg-gray-800 text-sm"
    >
      <FiDownload className="my-auto mr-2" />
      Download as CSV
    </a>
  );
}
