'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bot } from 'lucide-react';
import { Badge, PriorityDot, PriorityLabel } from '@/components/ui/badge';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, onClick, isDragOverlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg p-3 cursor-pointer task-card-hover ${isDragOverlay ? 'drag-overlay' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
      aria-label={`Task: ${task.title}`}
    >
      <div
        className="rounded-lg p-3"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Top row: Priority + ShortId */}
        <div className="flex items-center gap-2 mb-2">
          <PriorityDot priority={task.priority} />
          <PriorityLabel priority={task.priority} />
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {task.shortId}
          </span>
        </div>

        {/* Title */}
        <h4
          className="text-sm font-medium mb-2 line-clamp-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {task.title}
        </h4>

        {/* Bottom row: Labels + Progress + AI */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto">
          {task.labels?.map((label) => (
            <Badge key={label.id} color={label.color}>
              {label.name}
            </Badge>
          ))}

          {task.progress > 0 && (
            <Badge color="var(--gold)">
              {task.progress}%
            </Badge>
          )}

          <div className="flex-1" />

          {task.aiAssisted && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--gold)' }}
            >
              <Bot size={12} />
              ai
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Static version for DragOverlay
export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div
      className="rounded-lg p-3 drag-overlay"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--gold)',
        width: 280,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <PriorityDot priority={task.priority} />
        <PriorityLabel priority={task.priority} />
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          {task.shortId}
        </span>
      </div>
      <h4 className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>
        {task.title}
      </h4>
    </div>
  );
}
