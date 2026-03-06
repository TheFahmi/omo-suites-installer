'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Calendar,
  ScrollText,
  BarChart3,
  FlaskConical,
  Settings,
  Command,
  ChevronDown,
  Zap,
} from 'lucide-react';
import type { Workspace } from '@/lib/types';

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onWorkspaceChange: (id: string) => void;
}

const navItems = [
  { href: '/board', label: 'Kanban', icon: LayoutGrid },
  { href: '#', label: 'Plans', icon: Calendar, placeholder: true },
  { href: '/rules', label: 'Rules', icon: ScrollText },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '#', label: 'Lab', icon: FlaskConical, placeholder: true },
];

export function Sidebar({ workspaces, activeWorkspaceId, onWorkspaceChange }: SidebarProps) {
  const pathname = usePathname();
  const [wsOpen, setWsOpen] = useState(false);
  const activeWs = workspaces.find((ws) => ws.id === activeWorkspaceId);

  return (
    <aside
      className="hidden md:flex flex-col h-screen flex-shrink-0 sidebar-transition"
      style={{
        width: 240,
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
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Plan. Build. Launch.
        </p>
      </div>

      {/* Workspace Selector */}
      <div className="px-3 mb-2">
        <div className="relative">
          <button
            onClick={() => setWsOpen(!wsOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="text-base">{activeWs?.icon || '📁'}</span>
            <span className="flex-1 text-left truncate font-medium">
              {activeWs?.name || 'Select workspace'}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}
            >
              {activeWs?.taskCount ?? 0}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {wsOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    onWorkspaceChange(ws.id);
                    setWsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer"
                  style={{
                    background: ws.id === activeWorkspaceId ? 'var(--gold-dim)' : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span>{ws.icon}</span>
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {ws.taskCount ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: isActive ? 'var(--gold-dim)' : 'transparent',
                  color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                  opacity: item.placeholder ? 0.4 : 1,
                  pointerEvents: item.placeholder ? 'none' : 'auto',
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.placeholder && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded ml-auto"
                    style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <Command size={12} />
          <span>K to search</span>
        </div>
      </div>
    </aside>
  );
}
