// src/components/BandwidthUsageChart.jsx
import React, { useMemo } from 'react';

/**
 * Tiny sparkline-style bandwidth chart driven by usage summary.
 * Props:
 *  - data: expected shape from summarizeUserUsage → array of { user, last, totalRx, totalTx, samples }
 *  - onUserClick: optional callback when clicking a user label
 *
 * This version shows all users (sorted by total descending) and scales width accordingly.
 */
export default function BandwidthUsageChart({ data = [], onUserClick = () => {} }) {
  const summary = Array.isArray(data) ? data : [];

  // Build sparkline points: show total Rx+Tx per user (sorted descending)
  const points = useMemo(() => {
    if (!summary.length) return [];
    const list = summary.map(item => ({
      label: item.user,
      value: (Number(item.totalRx || 0) + Number(item.totalTx || 0))
    })).sort((a, b) => b.value - a.value);
    return list;
  }, [summary]);

  if (!points.length) {
    return (
      <div className="card bandwidth-chart">
        <h3>Bandwidth</h3>
        <div style={{ color: '#666' }}>No usage summary available.</div>
      </div>
    );
  }

  // dynamic width based on points — min 300, up to 1200; each point gets ~60px
  const pointWidth = 60;
  const width = Math.min(Math.max(300, points.length * pointWidth), 1200);
  const height = 80;
  const maxVal = Math.max(1, ...points.map(p => p.value));
  const step = points.length > 1 ? width / (points.length - 1) : width;

  // compute polyline (smoothed simplistic by duplicating points for curve feel)
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - (p.value / maxVal) * (height - 12) - 6;
    return { x, y, ...p };
  });

  const poly = coords.map(c => `${Math.round(c.x)},${Math.round(c.y)}`).join(' ');

  return (
    <div className="card bandwidth-chart">
      <h3>Bandwidth (by user — total Rx+Tx)</h3>

      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <svg width={width} height={height} style={{ display: 'block', marginBottom: 8 }}>
          <defs>
            <linearGradient id="bgGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2b8aef" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2b8aef" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* fill area under polyline */}
          <polyline
            points={poly}
            fill="none"
            stroke="#2b8aef"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

        </svg>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        {points.map(p => (
          <button
            key={p.label}
            onClick={() => onUserClick(p.label)}
            style={{ textAlign: 'left', border: '1px solid #eee', padding: 8, borderRadius: 8, background: '#fff', cursor: 'pointer' }}
            title={`Click to view history for ${p.label}`}
          >
            <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</div>
            <div style={{ fontWeight: 700 }}>{Math.round(p.value).toLocaleString()} MB</div>
          </button>
        ))}
      </div>
    </div>
  );
}
