'use client';

import { TrendingUp, CheckCircle2, Loader2, BarChart3 } from 'lucide-react';

interface OverviewProps {
  total: number;
  completed: number;
  inProgress: number;
  aiAssisted: number;
}

export function Overview({ total, completed, inProgress, aiAssisted }: OverviewProps) {
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cards = [
    {
      label: 'Total Tasks',
      value: total,
      icon: BarChart3,
      color: 'var(--text-primary)',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle2,
      color: 'var(--done)',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: Loader2,
      color: 'var(--progress)',
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'var(--gold)',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {card.label}
              </span>
              <Icon size={16} style={{ color: card.color }} />
            </div>
            <div
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-heading), sans-serif', color: card.color }}
            >
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
