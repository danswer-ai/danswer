import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";

interface SortSearchProps {
  isMobile?: boolean;
}

export function SortSearch({ isMobile }: SortSearchProps) {
  return (
    <>
      {isMobile && (
        <div className="w-full p-2.5">
          <span className="flex p-2 text-sm font-bold">Date</span>
          <div className="flex gap-2 flex-wrap">
            <Button>Today</Button>
            <Button variant="secondary">Last 7 days</Button>
            <Button variant="secondary">Last 30 days</Button>
          </div>
        </div>
      )}
      <div className="hidden lg:block">
        <Select>
          <SelectTrigger className="w-1/2 md:w-36">
            <SelectValue placeholder="Sort by" className="text-start" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-accessed">Last Accessed</SelectItem>
            <SelectItem value="tags">Tags/Labels</SelectItem>
            <SelectItem value="relevance">Relevance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
