'use client';

import { useState } from 'react';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  workspaceName: string;
  taskCount: number;
  onNewTask: () => void;
  onSearch: (query: string) => void;
}

export function Header({ workspaceName, taskCount, onNewTask, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Left: New Task */}
      <Button onClick={onNewTask} size="sm">
        <Plus size={16} />
        <span className="hidden sm:inline">New Task</span>
      </Button>

      {/* Center: Workspace info */}
      <div className="flex items-center gap-2">
        <h1
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-heading), sans-serif' }}
        >
          {workspaceName}
        </h1>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
        >
          {taskCount} tasks
        </span>
      </div>

      {/* Right: Search + Filter */}
      <div className="flex items-center gap-2">
        {showSearch ? (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search tasks..."
              autoFocus
              onBlur={() => {
                if (!searchQuery) setShowSearch(false);
              }}
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                width: 200,
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <Search size={14} />
            <span className="hidden sm:inline">Search</span>
            <kbd
              className="hidden sm:inline text-[10px] px-1 py-0.5 rounded ml-1"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              ⌘K
            </kbd>
          </button>
        )}

        <button
          className="p-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </header>
  );
}
