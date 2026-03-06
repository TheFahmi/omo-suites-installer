'use client';

import { useState, useEffect } from 'react';
import { Trash2, Bot, MessageSquare } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, PriorityDot } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { Task, Column, Label, Comment } from '@/lib/types';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  labels: Label[];
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskModal({
  task,
  isOpen,
  onClose,
  columns,
  labels,
  onUpdate,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(3);
  const [columnId, setColumnId] = useState('');
  const [progress, setProgress] = useState(0);
  const [assignee, setAssignee] = useState('');
  const [aiAssisted, setAiAssisted] = useState(false);
  const [aiAgent, setAiAgent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setColumnId(task.columnId);
      setProgress(task.progress);
      setAssignee(task.assignee || '');
      setAiAssisted(task.aiAssisted);
      setAiAgent(task.aiAgent || '');
      setDueDate(task.dueDate || '');
      setSelectedLabelIds(task.labels?.map((l) => l.id) || []);
      // Fetch comments
      api.get<Comment[]>(`/api/tasks/${task.id}/comments`).then(setComments).catch(() => {});
    }
  }, [task]);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Task>(`/api/tasks/${task.id}`, {
        title,
        description: description || null,
        priority,
        columnId,
        progress,
        assignee: assignee || null,
        aiAssisted,
        aiAgent: aiAgent || null,
        dueDate: dueDate || null,
        labelIds: selectedLabelIds,
      });
      onUpdate(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.del(`/api/tasks/${task.id}`);
      onDelete(task.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const comment = await api.post<Comment>(`/api/tasks/${task.id}/comments`, {
        author: 'user',
        content: newComment,
        isAi: false,
      });
      setComments([...comments, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="720px">
      <div className="p-6 space-y-5">
        {/* Short ID + Priority */}
        <div className="flex items-center gap-3">
          <PriorityDot priority={priority} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.shortId}</span>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-xl font-bold bg-transparent border-none outline-none"
          style={{
            fontFamily: 'var(--font-heading), sans-serif',
            color: 'var(--text-primary)',
          }}
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />

        {/* Grid of fields */}
        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
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

          {/* Column */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Status
            </label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
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

          {/* Assignee */}
          <Input
            label="Assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="e.g. @fahmi"
          />

          {/* Due Date */}
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          {/* Progress */}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Progress: {progress}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[#d4a853]"
            />
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full progress-bar"
                style={{ width: `${progress}%`, background: 'var(--gold)' }}
              />
            </div>
          </div>
        </div>

        {/* AI Agent */}
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Bot size={18} style={{ color: 'var(--gold)' }} />
          <div className="flex-1 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={aiAssisted}
                onChange={(e) => setAiAssisted(e.target.checked)}
                className="accent-[#d4a853]"
              />
              <span style={{ color: 'var(--text-secondary)' }}>AI Assisted</span>
            </label>
            {aiAssisted && (
              <input
                type="text"
                value={aiAgent}
                onChange={(e) => setAiAgent(e.target.value)}
                placeholder="Agent name..."
                className="flex-1 px-2 py-1 rounded text-sm bg-transparent"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            )}
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
            Labels
          </label>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const isSelected = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => toggleLabel(label.id)}
                  className="cursor-pointer transition-all"
                  style={{ opacity: isSelected ? 1 : 0.4 }}
                >
                  <Badge color={label.color} variant={isSelected ? 'default' : 'outline'}>
                    {label.name}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Comments ({comments.length})
            </span>
          </div>
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-xs" style={{ color: comment.isAi ? 'var(--gold)' : 'var(--text-primary)' }}>
                    {comment.author}
                    {comment.isAi && <Bot size={10} className="inline ml-1" />}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddComment();
              }}
            />
            <Button onClick={handleAddComment} size="sm" variant="secondary">
              Send
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={14} />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
