'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Kanban } from '@/components/board/kanban';
import { api } from '@/lib/api';
import { WifiOff, Zap } from 'lucide-react';
import type { BoardData, BoardColumn, SessionSummary } from '@/lib/types';

const REFRESH_INTERVAL = 30_000; // 30 seconds

export default function BoardPage() {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBoard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const queryParam = activeSessionId ? `?session=${activeSessionId}` : '';
      const data = await api.get<BoardData>(`/api/board${queryParam}`);
      setColumns(data.columns);
      setSessions(data.sessions);
      setConnected(true);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(String(err));
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId]);

  // Initial load + reload when session filter changes
  useEffect(() => {
    loadBoard(true);
  }, [loadBoard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      loadBoard(false);
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadBoard]);

  // Search filter
  const filteredColumns = searchQuery
    ? columns.map((col) => ({
        ...col,
        todos: col.todos.filter(
          (t) =>
            t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
    : columns;

  const totalTodos = filteredColumns.reduce((sum, col) => sum + col.todos.length, 0);

  const headerTitle = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)?.title || 'Session'
    : 'All Sessions';

  // Error/disconnected state
  if (!loading && !connected) {
    return (
      <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
        <Sidebar
          sessions={[]}
          activeSessionId={null}
          onSessionChange={setActiveSessionId}
          connected={false}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <WifiOff size={28} style={{ color: 'var(--p1)' }} />
            </div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ fontFamily: 'var(--font-heading), sans-serif' }}
            >
              No OpenCode Instance Detected
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Launchboard connects to OpenCode&apos;s API to display your sessions and todos.
              Make sure OpenCode is running.
            </p>
            <div
              className="rounded-lg p-4 text-left text-sm"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Quick start:
              </p>
              <code
                className="block px-3 py-2 rounded text-xs"
                style={{ background: 'var(--bg-primary)', color: 'var(--gold)' }}
              >
                opencode
              </code>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                Default API: http://localhost:1337
              </p>
            </div>
            <button
              onClick={() => loadBoard(true)}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
              style={{
                background: 'var(--gold)',
                color: '#0a0a0a',
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap size={24} style={{ color: 'var(--gold)' }} />
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Connecting to OpenCode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionChange={setActiveSessionId}
        connected={connected}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={headerTitle}
          todoCount={totalTodos}
          onSearch={setSearchQuery}
          onRefresh={() => loadBoard(false)}
          lastRefresh={lastRefresh}
          loading={loading}
        />

        {/* Empty state for no todos */}
        {totalTodos === 0 && !loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No todos found
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {activeSessionId
                  ? 'This session has no todos yet'
                  : 'Start coding with OpenCode to generate todos'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <Kanban columns={filteredColumns} />
          </div>
        )}
      </div>
    </div>
  );
}
