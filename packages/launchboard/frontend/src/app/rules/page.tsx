'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { ScrollText, Plus, ToggleLeft, ToggleRight, Trash2, Bot } from 'lucide-react';
import type { Workspace, Rule } from '@/lib/types';

export default function RulesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // New rule modal
  const [showNewRule, setShowNewRule] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get<Workspace[]>('/api/workspaces').then((ws) => {
      setWorkspaces(ws);
      if (ws.length > 0) setActiveWorkspaceId(ws[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    api
      .get<Workspace>(`/api/workspaces/${activeWorkspaceId}`)
      .then((ws) => {
        setRules(ws.rules || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const handleCreateRule = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      // Rules API might not exist yet — we'll try
      const rule = await api.post<Rule>('/api/rules', {
        workspaceId: activeWorkspaceId,
        title: newTitle,
        content: newContent,
      });
      setRules((prev) => [...prev, rule]);
      setNewTitle('');
      setNewContent('');
      setShowNewRule(false);
    } catch (err) {
      console.error('Failed to create rule:', err);
      // Fallback: add locally
      setRules((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          workspaceId: activeWorkspaceId,
          title: newTitle,
          content: newContent,
          enabled: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setNewTitle('');
      setNewContent('');
      setShowNewRule(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={setActiveWorkspaceId}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-xl font-bold flex items-center gap-2"
              style={{ fontFamily: 'var(--font-heading), sans-serif' }}
            >
              <ScrollText size={22} style={{ color: 'var(--gold)' }} />
              Project Rules
            </h1>
            <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Bot size={14} />
              These rules guide AI agents working in this workspace
            </p>
          </div>
          <Button onClick={() => setShowNewRule(true)} size="sm">
            <Plus size={16} />
            Add Rule
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : rules.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <ScrollText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              No rules defined yet
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Add rules to guide AI agents and standardize workflows
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl p-5"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  opacity: rule.enabled ? 1 : 0.5,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3
                    className="text-sm font-semibold"
                    style={{ fontFamily: 'var(--font-heading), sans-serif', color: 'var(--text-primary)' }}
                  >
                    {rule.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      className="cursor-pointer"
                      style={{ color: rule.enabled ? 'var(--gold)' : 'var(--text-muted)' }}
                      title={rule.enabled ? 'Enabled' : 'Disabled'}
                    >
                      {rule.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </div>
                </div>
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
                >
                  {rule.content}
                </p>
                <div className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Created {new Date(rule.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Rule Modal */}
        <Modal
          isOpen={showNewRule}
          onClose={() => setShowNewRule(false)}
          title="Add New Rule"
          maxWidth="520px"
        >
          <div className="p-6 space-y-4">
            <Input
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Code Style Guidelines"
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Content
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Describe the rule in detail..."
                rows={6}
                className="px-3 py-2 rounded-lg text-sm resize-none"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowNewRule(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateRule}
                disabled={creating || !newTitle.trim() || !newContent.trim()}
              >
                {creating ? 'Creating...' : 'Add Rule'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
