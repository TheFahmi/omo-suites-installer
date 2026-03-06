'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, CheckCircle2 } from 'lucide-react';
import { TaskCard } from './task-card';
import type { Column as ColumnType, Task } from '@/lib/types';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
}

function ColumnDot({ columnName }: { columnName: string }) {
  const name = columnName.toLowerCase();

  if (name.includes('done')) {
    return <CheckCircle2 size={14} style={{ color: 'var(--done)' }} />;
  }

  const colorMap: Record<string, { color: string; pulse?: boolean }> = {
    backlog: { color: '#6b7280' },
    planned: { color: '#3b82f6' },
    ready: { color: '#22c55e' },
    'in progress': { color: 'var(--gold)', pulse: true },
    progress: { color: 'var(--gold)', pulse: true },
    testing: { color: '#f59e0b' },
  };

  const match = Object.entries(colorMap).find(([key]) => name.includes(key));
  const dotColor = match?.[1].color || '#6b7280';
  const shouldPulse = match?.[1].pulse || false;

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${shouldPulse ? 'animate-gold-pulse' : ''}`}
      style={{ backgroundColor: dotColor }}
    />
  );
}

export function Column({ column, tasks, onTaskClick, onAddTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const taskIds = tasks.map((t) => t.id);
  const isOverWip = column.wipLimit ? tasks.length >= column.wipLimit : false;

  return (
    <div
      className="flex flex-col flex-shrink-0 rounded-xl"
      style={{
        width: 300,
        minWidth: 300,
        background: 'var(--bg-column)',
        border: isOver ? '1px solid var(--gold)' : '1px solid var(--border)',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <ColumnDot columnName={column.name} />
        <h3
          className="text-sm font-semibold flex-1"
          style={{ fontFamily: 'var(--font-heading), sans-serif', color: 'var(--text-primary)' }}
        >
          {column.name}
        </h3>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
        >
          {tasks.length}
          {column.wipLimit && (
            <span style={{ color: isOverWip ? 'var(--p1)' : 'var(--text-muted)' }}>
              /{column.wipLimit}
            </span>
          )}
        </span>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-1.5"
        style={{ minHeight: 100 }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Task */}
      <div className="px-3 pb-3 flex-shrink-0">
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
          }}
        >
          <Plus size={14} />
          Add task
        </button>
      </div>
    </div>
  );
}
