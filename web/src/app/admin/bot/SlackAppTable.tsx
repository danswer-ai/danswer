"use client";

import { PageSelector } from "@/components/PageSelector";
import { SlackApp } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@tremor/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiCheck, FiEdit, FiXCircle } from "react-icons/fi";

const NUM_IN_PAGE = 20;

function ClickableTableRow({
  url,
  children,
  ...props
}: {
  url: string;
  children: React.ReactNode;
  [key: string]: any; // This allows for any additional props
}) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(url);
  }, [router]);

  const navigate = () => {
    router.push(url);
  };

  return (
    <TableRow {...props} onClick={navigate}>
      {children}
    </TableRow>
  );
}

export function SlackAppTable({
  slackApps,
}: {
    slackApps: SlackApp[];
}) {
  const [page, setPage] = useState(1);

  // sort by id for consistent ordering
  slackApps.sort((a, b) => {
    if (a.id < b.id) {
      return -1;
    } else if (a.id > b.id) {
      return 1;
    } else {
      return 0;
    }
  });

  const slackAppsForPage = slackApps.slice(
    NUM_IN_PAGE * (page - 1),
    NUM_IN_PAGE * page
  );

  return (
    <div>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
            <TableHeaderCell>Enabled</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {slackAppsForPage.map((slackApp) => {
            return (
              <ClickableTableRow
                url={`/admin/bot/app/${slackApp.id}`}
                key={slackApp.id}
                className={
                  "hover:bg-hover-light bg-background cursor-pointer relative"
                }
              >
                <TableCell>
                  <div className="flex my-auto">
                    <FiEdit className="mr-4 my-auto" />
                    {slackApp.name}
                  </div>
                </TableCell>
                <TableCell>
                    {slackApp.description}
                </TableCell>
                <TableCell>
                  {slackApp.enabled ? (
                    <FiCheck className="my-auto text-emerald-600" size="18" />
                  ) : (
                    <FiXCircle className="my-auto text-red-600" />
                  )}
                </TableCell>
              </ClickableTableRow>
            );
          })}
        </TableBody>
      </Table>
      {slackApps.length > NUM_IN_PAGE && (
        <div className="mt-3 flex">
          <div className="mx-auto">
            <PageSelector
              totalPages={Math.ceil(
                slackApps.length / NUM_IN_PAGE
              )}
              currentPage={page}
              onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({
                  top: 0,
                  left: 0,
                  behavior: "smooth",
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
