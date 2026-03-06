'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Kanban } from '@/components/board/kanban';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { Workspace, Column, Task, Label } from '@/lib/types';

export default function BoardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Task modal state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState(3);
  const [newTaskColumnId, setNewTaskColumnId] = useState('');
  const [creating, setCreating] = useState(false);

  // Load workspaces
  useEffect(() => {
    const load = async () => {
      try {
        const ws = await api.get<Workspace[]>('/api/workspaces');
        setWorkspaces(ws);
        if (ws.length > 0) {
          setActiveWorkspaceId(ws[0].id);
        }
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      }
    };
    load();
  }, []);

  // Load workspace data when active workspace changes
  const loadWorkspaceData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    try {
      const [cols, allTasks, lbls] = await Promise.all([
        api.get<Column[]>(`/api/columns?workspace=${activeWorkspaceId}`),
        api.get<Task[]>(`/api/tasks?workspace=${activeWorkspaceId}`),
        api.get<Label[]>(`/api/labels?workspace=${activeWorkspaceId}`),
      ]);
      setColumns(cols);
      setTasks(allTasks);
      setLabels(lbls);
      if (cols.length > 0 && !newTaskColumnId) {
        setNewTaskColumnId(cols[0].id);
      }
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Create task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setCreating(true);
    try {
      const task = await api.post<Task>('/api/tasks', {
        workspaceId: activeWorkspaceId,
        title: newTaskTitle,
        priority: newTaskPriority,
        columnId: newTaskColumnId || undefined,
      });
      setTasks((prev) => [...prev, { ...task, labels: [] }]);
      setNewTaskTitle('');
      setNewTaskPriority(3);
      setShowNewTask(false);
      // Refresh workspace counts
      const ws = await api.get<Workspace[]>('/api/workspaces');
      setWorkspaces(ws);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setCreating(false);
    }
  };

  // Search filter
  const filteredTasks = searchQuery
    ? tasks.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.shortId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const activeWs = workspaces.find((ws) => ws.id === activeWorkspaceId);

  if (loading && workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading Launchboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={setActiveWorkspaceId}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          workspaceName={activeWs?.name || 'Workspace'}
          taskCount={filteredTasks.length}
          onNewTask={() => setShowNewTask(true)}
          onSearch={setSearchQuery}
        />

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Kanban
              columns={columns}
              tasks={filteredTasks}
              labels={labels}
              onTasksChange={setTasks}
              onTaskDeleted={(taskId) => {
                setTasks((prev) => prev.filter((t) => t.id !== taskId));
              }}
            />
          </div>
        )}
      </div>

      {/* New Task Modal */}
      <Modal
        isOpen={showNewTask}
        onClose={() => setShowNewTask(false)}
        title="Create New Task"
        maxWidth="480px"
      >
        <div className="p-6 space-y-4">
          <Input
            label="Title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateTask();
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                className="px-3 py-2 rounded-lg text-sm cursor-pointer"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value={1}>P1 - Critical</option>
                <option value={2}>P2 - High</option>
                <option value={3}>P3 - Medium</option>
                <option value={4}>P4 - Low</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Column
              </label>
              <select
                value={newTaskColumnId}
                onChange={(e) => setNewTaskColumnId(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm cursor-pointer"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowNewTask(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateTask} disabled={creating || !newTaskTitle.trim()}>
              {creating ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
