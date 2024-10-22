import React, { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableRow } from "./DraggableRow";
import { Row } from "./interfaces";
import { StaticRow } from "./StaticRow";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useParams, useRouter } from "next/navigation";

export function DraggableTable({
  headers,
  rows,
  setRows,
  isAdmin,
}: {
  headers: (string | JSX.Element | null)[];
  rows: Row[];
  setRows: (newRows: UniqueIdentifier[]) => void | Promise<void>;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const { teamspaceId } = useParams();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>();
  const items = useMemo(() => rows?.map(({ id }) => id), [rows]);
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  function handleDragStart(event: DragStartEvent) {
    if (isAdmin) {
      setActiveId(event.active.id);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (isAdmin) {
      const { active, over } = event;
      if (over !== null && active.id !== over.id) {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        setRows(arrayMove(rows, oldIndex, newIndex).map((row) => row.id));
      }
    }
    setActiveId(null);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const selectedRow = useMemo(() => {
    if (activeId === null || activeId === undefined) {
      return null;
    }
    const row = rows.find(({ id }) => id === activeId);
    return row;
  }, [activeId, rows]);

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            {headers.map((header, ind) => (
              <TableHead key={ind}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {rows.map((row) => {
              return (
                <DraggableRow
                  key={row.id}
                  row={row}
                  isAdmin={isAdmin}
                  onClick={() =>
                    router.push(
                      `/t/${teamspaceId}/admin/assistants/${row.id}?u=${Date.now()}`
                    )
                  }
                />
              );
            })}
          </SortableContext>

          <DragOverlay>
            {selectedRow && (
              <Table>
                <TableBody>
                  <StaticRow key={selectedRow.id} row={selectedRow} />
                </TableBody>
              </Table>
            )}
          </DragOverlay>
        </TableBody>
      </Table>
    </DndContext>
  );
}
