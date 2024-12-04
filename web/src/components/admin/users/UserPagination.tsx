import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
}

const UserPagination = ({
  currentPage,
  totalPages,
  goToPage,
}: PaginationProps) => {
  const [inputPage, setInputPage] = useState("");

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNumber = parseInt(inputPage);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      goToPage(pageNumber);
      setInputPage("");
    }
  };

  return totalPages > 1 ? (
    <Pagination>
      <PaginationContent className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>

        <div className="flex gap-1 items-center">
          <PaginationItem>
            <PaginationLink
              href="#"
              className="border border-gray-300 rounded p-1 h-7 w-7 flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                goToPage(1);
              }}
            >
              <ChevronsLeft className="h-3 w-3" />
            </PaginationLink>
          </PaginationItem>

          <PaginationItem>
            <PaginationLink
              href="#"
              className="border border-gray-300 rounded p-1 h-7 w-7 flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                goToPage(Math.max(currentPage - 1, 1));
              }}
            >
              <ChevronLeft className="h-3 w-3" />
            </PaginationLink>
          </PaginationItem>

          <form onSubmit={handleGoToPage} className="flex items-center">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              placeholder={currentPage.toString()}
              className="w-10 h-7 px-2 border border-gray-300 rounded text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </form>

          <PaginationItem>
            <PaginationLink
              href="#"
              className="border border-gray-300 rounded p-1 h-7 w-7 flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                goToPage(Math.min(currentPage + 1, totalPages));
              }}
            >
              <ChevronRight className="h-3 w-3" />
            </PaginationLink>
          </PaginationItem>

          <PaginationItem>
            <PaginationLink
              href="#"
              className="border border-gray-300 rounded p-1 h-7 w-7 flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                goToPage(totalPages);
              }}
            >
              <ChevronsRight className="h-3 w-3" />
            </PaginationLink>
          </PaginationItem>
        </div>
      </PaginationContent>
    </Pagination>
  ) : null;
};

export default UserPagination;
