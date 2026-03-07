'use client';

import { useState } from 'react';
import {
  LayoutGrid,
  Zap,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Clock,
  GitBranch,
} from 'lucide-react';
import type { SessionSummary } from '@/lib/types';

interface SidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  onSessionChange: (id: string | null) => void;
  connected: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000; // OpenCode timestamps are in seconds
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function Sidebar({ sessions, activeSessionId, onSessionChange, connected }: SidebarProps) {
  const [sessionsOpen, setSessionsOpen] = useState(true);

  return (
    <aside
      className="hidden md:flex flex-col h-screen flex-shrink-0 sidebar-transition"
      style={{
        width: 260,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Zap size={20} style={{ color: 'var(--gold)' }} />
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-heading), sans-serif', color: 'var(--text-primary)' }}
          >
            Launchboard
          </span>
        </div>
        <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: connected ? 'var(--done)' : 'var(--p1)' }}
          />
          {connected ? 'Connected to OpenCode' : 'OpenCode not detected'}
        </p>
      </div>

      {/* All Sessions button */}
      <div className="px-3 mb-1">
        <button
          onClick={() => onSessionChange(null)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{
            background: activeSessionId === null ? 'var(--gold-dim)' : 'transparent',
            color: activeSessionId === null ? 'var(--gold)' : 'var(--text-secondary)',
            fontWeight: activeSessionId === null ? 600 : 400,
          }}
        >
          <LayoutGrid size={18} />
          <span>All Sessions</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded ml-auto"
            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
          >
            {sessions.reduce((sum, s) => sum + s.todoCount, 0)}
          </span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setSessionsOpen(!sessionsOpen)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          {sessionsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="uppercase tracking-wider">Sessions</span>
          <span className="ml-auto">{sessions.length}</span>
        </button>
      </div>

      {sessionsOpen && (
        <nav className="flex-1 px-3 overflow-y-auto space-y-0.5">
          {sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            const dirName = session.directory.split('/').pop() || session.directory;

            return (
              <button
                key={session.id}
                onClick={() => onSessionChange(session.id)}
                className="w-full flex flex-col gap-0.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer"
                style={{
                  background: isActive ? 'var(--gold-dim)' : 'transparent',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch
                    size={14}
                    className="flex-shrink-0"
                    style={{ color: isActive ? 'var(--gold)' : 'var(--text-muted)' }}
                  />
                  <span
                    className="text-sm truncate flex-1"
                    style={{
                      color: isActive ? 'var(--gold)' : 'var(--text-primary)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {session.title || session.id.slice(0, 8)}
                  </span>
                  {session.todoCount > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}
                    >
                      {session.todoCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 pl-5 min-w-0">
                  <FolderOpen size={10} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {dirName}
                  </span>
                  <Clock size={10} className="flex-shrink-0 ml-auto" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {formatRelativeTime(session.time.updated)}
                  </span>
                </div>
              </button>
            );
          })}
          {sessions.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No sessions found
              </p>
            </div>
          )}
        </nav>
      )}

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2">
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>OpenCode Launchboard v1.0</span>
        </div>
      </div>
    </aside>
  );
}
