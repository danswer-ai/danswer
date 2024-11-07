import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";

const MAX_PAGINATION_OPTIONS = 6;
const PAGINATION_OPTIONS_ON_EACH_SIDE = 2;

const getPaginationOptions = (currentPage: number, pageCount: number) => {
  const paginationOptions = [];
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < pageCount;

  // Handle "Prev" button
  if (hasPrev) {
    paginationOptions.push(1);
  }

  // Add pages on the left side
  for (
    let i = Math.max(2, currentPage - PAGINATION_OPTIONS_ON_EACH_SIDE);
    i < currentPage;
    i++
  ) {
    if (paginationOptions.length < MAX_PAGINATION_OPTIONS - 1) {
      paginationOptions.push(i);
    }
  }

  // Current page
  paginationOptions.push(currentPage);

  // Add pages on the right side
  for (
    let i = currentPage + 1;
    i <= Math.min(pageCount - 1, currentPage + PAGINATION_OPTIONS_ON_EACH_SIDE);
    i++
  ) {
    if (paginationOptions.length < MAX_PAGINATION_OPTIONS - 1) {
      paginationOptions.push(i);
    }
  }

  // Handle ellipsis and last page
  const finalOptions = [];
  let lastAddedPage = null;

  for (let i = 0; i < paginationOptions.length; i++) {
    const page = paginationOptions[i];

    if (lastAddedPage !== null && page - lastAddedPage > 1) {
      finalOptions.push(
        <PaginationEllipsis key={`ellipsis-${finalOptions.length}`} />
      );
    }

    finalOptions.push(page);
    lastAddedPage = page;

    // Limit final options to a maximum of 6
    if (finalOptions.length >= MAX_PAGINATION_OPTIONS) {
      break;
    }
  }

  // Add ellipsis before the last page if necessary
  if (hasNext && finalOptions[finalOptions.length - 1] !== pageCount) {
    if (finalOptions[finalOptions.length - 1] !== pageCount - 1) {
      finalOptions.push(<PaginationEllipsis key={`ellipsis-last`} />);
    }
    finalOptions.push(pageCount);
  }

  return finalOptions;
};

const scrollUp = () => {
  setTimeout(() => window.scrollTo({ top: 0 }), 50);
};

export interface PageSelectorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  shouldScroll?: boolean;
}

export const PageSelector = ({
  currentPage,
  totalPages,
  onPageChange,
  shouldScroll = false,
}: PageSelectorProps) => {
  const paginationOptions = getPaginationOptions(currentPage, totalPages);

  const handlePageChange = (page: number) => {
    onPageChange(page);
    if (shouldScroll) scrollUp();
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>

        {paginationOptions.map((page, index) => (
          <PaginationItem key={index}>
            {typeof page === "number" ? (
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </PaginationLink>
            ) : (
              page
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={() =>
              currentPage < totalPages && handlePageChange(currentPage + 1)
            }
            className={
              currentPage === totalPages ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
