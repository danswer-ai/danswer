import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SortSearch() {
  return (
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
  );
}
