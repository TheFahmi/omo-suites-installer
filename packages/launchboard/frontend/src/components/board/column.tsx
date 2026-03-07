'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { TodoCard } from './task-card';
import type { BoardColumn as BoardColumnType } from '@/lib/types';

interface ColumnProps {
  column: BoardColumnType;
}

function ColumnIcon({ columnId }: { columnId: string }) {
  const icons: Record<string, React.ReactNode> = {
    pending: <Circle size={14} style={{ color: '#6b7280' }} />,
    in_progress: (
      <Loader2
        size={14}
        className="animate-gold-pulse"
        style={{ color: 'var(--gold)' }}
      />
    ),
    completed: <CheckCircle2 size={14} style={{ color: 'var(--done)' }} />,
    cancelled: <XCircle size={14} style={{ color: 'var(--p1)' }} />,
  };

  return <>{icons[columnId] || <Circle size={14} style={{ color: '#6b7280' }} />}</>;
}

export function Column({ column }: ColumnProps) {
  return (
    <div
      className="flex flex-col flex-shrink-0 rounded-xl"
      style={{
        width: 300,
        minWidth: 300,
        background: 'var(--bg-column)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <ColumnIcon columnId={column.id} />
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
          {column.todos.length}
        </span>
      </div>

      {/* Todos */}
      <div className="flex-1 overflow-y-auto p-2" style={{ minHeight: 80 }}>
        {column.todos.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No todos
            </p>
          </div>
        ) : (
          column.todos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} />
          ))
        )}
      </div>
    </div>
  );
}
