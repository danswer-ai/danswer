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

const PAGINATION_OPTIONS_ON_EACH_SIDE = 2;

const getPaginationOptions = (
  currentPage: number,
  pageCount: number
): number[] => {
  const paginationOptions = [currentPage];
  // if (currentPage !== 1) {
  //   paginationOptions.push(currentPage)
  // }

  let offset = 1;

  // Add one because currentPage is included
  const maxPaginationOptions = PAGINATION_OPTIONS_ON_EACH_SIDE * 2 + 1;
  while (paginationOptions.length < maxPaginationOptions) {
    let added = false;
    if (currentPage + offset <= pageCount) {
      paginationOptions.push(currentPage + offset);
      added = true;
    }
    if (currentPage - offset >= 1) {
      paginationOptions.unshift(currentPage - offset);
      added = true;
    }
    if (!added) {
      break;
    }
    offset++;
  }

  return paginationOptions;
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
  const modifiedScrollUp = () => {
    if (shouldScroll) {
      scrollUp();
    }
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={() => {
              onPageChange(Math.max(currentPage - 1, 1));
              modifiedScrollUp();
            }}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>

        {!paginationOptions.includes(1) && (
          <>
            <PaginationItem>
              <PaginationLink
                href="#"
                onClick={() => {
                  onPageChange(1);
                  modifiedScrollUp();
                }}
              >
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          </>
        )}

        {(!paginationOptions.includes(1)
          ? paginationOptions.slice(2)
          : paginationOptions
        ).map((page) => {
          return (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={() => {
                  onPageChange(page);
                  modifiedScrollUp();
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={() => {
              onPageChange(Math.min(currentPage + 1, totalPages));
              modifiedScrollUp();
            }}
            className={
              currentPage === totalPages ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
