'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Column } from './column';
import { TaskCardOverlay } from './task-card';
import { TaskModal } from './task-modal';
import { api } from '@/lib/api';
import type { Column as ColumnType, Task, Label } from '@/lib/types';

interface KanbanProps {
  columns: ColumnType[];
  tasks: Task[];
  labels: Label[];
  onTasksChange: (tasks: Task[]) => void;
  onTaskDeleted: (taskId: string) => void;
}

export function Kanban({ columns, tasks, labels, onTasksChange, onTaskDeleted }: KanbanProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const getTasksByColumn = useCallback(
    (columnId: string) => {
      return tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.position - b.position);
    },
    [tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskData = tasks.find((t) => t.id === active.id);
    if (!activeTaskData) return;

    let overColumnId: string;

    // Check if over is a column or a task
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      overColumnId = overTask.columnId;
    } else {
      overColumnId = over.id as string;
    }

    if (activeTaskData.columnId !== overColumnId) {
      // Move task to new column optimistically
      const updatedTasks = tasks.map((t) =>
        t.id === activeTaskData.id ? { ...t, columnId: overColumnId } : t
      );
      onTasksChange(updatedTasks);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskData = tasks.find((t) => t.id === active.id);
    if (!activeTaskData) return;

    let targetColumnId: string;
    let newPosition: number;

    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      targetColumnId = overTask.columnId;
      const columnTasks = getTasksByColumn(targetColumnId);
      const overIndex = columnTasks.findIndex((t) => t.id === over.id);
      newPosition = overIndex >= 0 ? overIndex : 0;
    } else {
      targetColumnId = over.id as string;
      const columnTasks = getTasksByColumn(targetColumnId);
      newPosition = columnTasks.length;
    }

    // Optimistic update
    const updatedTasks = tasks.map((t) =>
      t.id === activeTaskData.id
        ? { ...t, columnId: targetColumnId, position: newPosition }
        : t
    );
    onTasksChange(updatedTasks);

    // API call
    try {
      await api.post(`/api/tasks/${activeTaskData.id}/move`, {
        columnId: targetColumnId,
        position: newPosition,
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert on error
      onTasksChange(tasks);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    const updatedTasks = tasks.map((t) =>
      t.id === updatedTask.id ? { ...updatedTask, labels: t.labels } : t
    );
    onTasksChange(updatedTasks);
  };

  const handleTaskDelete = (taskId: string) => {
    onTaskDeleted(taskId);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 overflow-x-auto h-full">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={getTasksByColumn(column.id)}
              onTaskClick={handleTaskClick}
              onAddTask={() => {}}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        task={selectedTask}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTask(null);
        }}
        columns={columns}
        labels={labels}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />
    </>
  );
}
