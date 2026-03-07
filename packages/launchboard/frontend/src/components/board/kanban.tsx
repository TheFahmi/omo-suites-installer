'use client';

import { Column } from './column';
import type { BoardColumn } from '@/lib/types';

interface KanbanProps {
  columns: BoardColumn[];
}

export function Kanban({ columns }: KanbanProps) {
  return (
    <div className="flex gap-4 p-4 overflow-x-auto h-full">
      {columns.map((column) => (
        <Column key={column.id} column={column} />
      ))}
    </div>
  );
}
