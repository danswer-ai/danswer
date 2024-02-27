import { TableCell, TableRow } from "@tremor/react";
import { DragHandle } from "./DragHandle";
import { Row } from "./interfaces";

export function StaticRow({ row }: { row: Row }) {
  return (
    <TableRow className="bg-background dark:bg-neutral-800 border-b dark:border-b-border-dark border-border dark:border-neutral-900">
      <TableCell>
        <DragHandle isDragging />
      </TableCell>
      {row.cells.map((column, ind) => {
        const rowModifier =
          row.staticModifiers &&
          row.staticModifiers.find((mod) => mod[0] === ind);
        return (
          <TableCell key={ind} className={rowModifier && rowModifier[1]}>
            {column}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
