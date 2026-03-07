'use client';

import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface HeaderProps {
  title: string;
  todoCount: number;
  onSearch: (query: string) => void;
  onRefresh: () => void;
  lastRefresh: Date | null;
  loading: boolean;
}

export function Header({ title, todoCount, onSearch, onRefresh, lastRefresh, loading }: HeaderProps) {
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
      {/* Left: Title + count */}
      <div className="flex items-center gap-2">
        <h1
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-heading), sans-serif' }}
        >
          {title}
        </h1>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
        >
          {todoCount} {todoCount === 1 ? 'todo' : 'todos'}
        </span>
      </div>

      {/* Right: Search + Refresh */}
      <div className="flex items-center gap-2">
        {showSearch ? (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search todos..."
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
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
          title={lastRefresh ? `Last refresh: ${lastRefresh.toLocaleTimeString()}` : 'Refresh'}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
