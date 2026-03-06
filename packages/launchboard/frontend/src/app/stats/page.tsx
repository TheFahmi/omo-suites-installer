'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Overview } from '@/components/stats/overview';
import { BarChart, VelocityChart } from '@/components/stats/charts';
import { api } from '@/lib/api';
import { Clock } from 'lucide-react';
import type { Workspace, Stats, VelocityEntry, ActivityLog } from '@/lib/types';

export default function StatsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [velocity, setVelocity] = useState<VelocityEntry[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Workspace[]>('/api/workspaces').then((ws) => {
      setWorkspaces(ws);
      if (ws.length > 0) setActiveWorkspaceId(ws[0].id);
    });
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    Promise.all([
      api.get<Stats>(`/api/stats/${activeWorkspaceId}`),
      api.get<VelocityEntry[]>(`/api/stats/${activeWorkspaceId}/velocity?period=day`),
      api.get<ActivityLog[]>(`/api/stats/${activeWorkspaceId}/activity?limit=20`),
    ])
      .then(([s, v, a]) => {
        setStats(s);
        setVelocity(v);
        setActivity(a);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const inProgressCount = stats?.byColumn.find((c) =>
    c.column.toLowerCase().includes('progress')
  )?.count ?? 0;

  const priorityColors: Record<string, string> = {
    critical: 'var(--p1)',
    high: 'var(--p2)',
    medium: 'var(--p3)',
    low: 'var(--p4)',
  };

  const actionLabels: Record<string, string> = {
    task_created: 'Created task',
    task_updated: 'Updated task',
    task_moved: 'Moved task',
    task_deleted: 'Deleted task',
    comment_added: 'Added comment',
    workspace_created: 'Created workspace',
  };

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={setActiveWorkspaceId}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-heading), sans-serif' }}
        >
          Dashboard
        </h1>

        {loading || !stats ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            <Overview
              total={stats.total}
              completed={stats.completed}
              inProgress={inProgressCount}
              aiAssisted={stats.aiAssisted}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChart
                title="Tasks by Priority"
                data={stats.byPriority.map((p) => ({
                  label: p.name.charAt(0).toUpperCase() + p.name.slice(1),
                  value: p.count,
                  color: priorityColors[p.name] || 'var(--text-muted)',
                }))}
              />

              <BarChart
                title="Tasks by Column"
                data={stats.byColumn.map((c) => ({
                  label: c.column,
                  value: c.count,
                  color: 'var(--gold)',
                }))}
              />

              <VelocityChart
                title="Velocity (Tasks completed per day)"
                data={velocity}
              />

              {/* Activity Feed */}
              <div
                className="rounded-xl p-5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <h3
                  className="text-sm font-semibold mb-4"
                  style={{ fontFamily: 'var(--font-heading), sans-serif', color: 'var(--text-primary)' }}
                >
                  Recent Activity
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activity.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No activity yet
                    </p>
                  ) : (
                    activity.map((a) => {
                      let details: Record<string, string> = {};
                      try {
                        details = a.details ? JSON.parse(a.details) : {};
                      } catch { /* empty */ }

                      return (
                        <div
                          key={a.id}
                          className="flex items-start gap-3 text-sm"
                        >
                          <Clock size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <div className="flex-1 min-w-0">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{a.actor}</strong>
                              {' '}{actionLabels[a.action] || a.action}
                              {details.title && (
                                <> — <span style={{ color: 'var(--gold)' }}>{details.title}</span></>
                              )}
                              {details.columnName && (
                                <> to <span style={{ color: 'var(--gold)' }}>{details.columnName}</span></>
                              )}
                            </span>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {new Date(a.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
