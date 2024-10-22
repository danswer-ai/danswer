import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function DownloadAsCSV() {
  return (
    <a href="/api/admin/query-history-csv" className="md:ml-auto">
      <Button>
        <Download size={16} />
        Download as CSV
      </Button>
    </a>
  );
}
