'use client';

interface BarChartProps {
  title: string;
  data: { label: string; value: number; color: string }[];
}

export function BarChart({ title, data }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ fontFamily: 'var(--font-heading), sans-serif', color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span
              className="text-xs w-20 text-right flex-shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              {item.label}
            </span>
            <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color,
                  minWidth: item.value > 0 ? 4 : 0,
                }}
              />
            </div>
            <span className="text-xs w-8 font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface VelocityChartProps {
  title: string;
  data: { period: string; count: number }[];
}

export function VelocityChart({ title, data }: VelocityChartProps) {
  const maxValue = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 120;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ fontFamily: 'var(--font-heading), sans-serif', color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No velocity data yet
        </p>
      ) : (
        <div className="flex items-end gap-1" style={{ height: chartHeight }}>
          {data.slice(-14).reverse().map((item, i) => {
            const height = (item.count / maxValue) * chartHeight;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${item.period}: ${item.count}`}
              >
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: Math.max(height, 2),
                    backgroundColor: 'var(--gold)',
                    opacity: 0.6 + (i / data.length) * 0.4,
                    minHeight: item.count > 0 ? 4 : 2,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
