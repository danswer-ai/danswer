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
import { FiInfo } from "react-icons/fi";

export function PersonasTable({ personas }: { personas: Persona[] }) {
  const router = useRouter();

  const sortedPersonas = [...personas];
  sortedPersonas.sort((a, b) => (a.id > b.id ? 1 : -1));

  return (
    <div>
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
            <TableHeaderCell>Built-In</TableHeaderCell>
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
                <TableCell>{persona.default_persona ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <div className="flex">
                    <div className="mx-auto">
                      {!persona.default_persona ? (
                        <EditButton
                          onClick={() =>
                            router.push(`/admin/personas/${persona.id}`)
                          }
                        />
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
