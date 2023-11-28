"use client";

import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from "@tremor/react";
import { Persona } from "./interfaces";
import { EditButton } from "@/components/EditButton";
import { useRouter } from "next/navigation";

export function PersonasTable({ personas }: { personas: Persona[] }) {
  const router = useRouter();

  const sortedPersonas = [...personas];
  sortedPersonas.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="dark">
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
            <TableHeaderCell></TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedPersonas.map((persona) => {
            return (
              <TableRow key={persona.id}>
                <TableCell className="whitespace-normal break-all">
                  <p className="text font-medium">{persona.name}</p>
                </TableCell>
                <TableCell>{persona.description}</TableCell>
                <TableCell>
                  <EditButton
                    onClick={() => router.push(`/admin/personas/${persona.id}`)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
