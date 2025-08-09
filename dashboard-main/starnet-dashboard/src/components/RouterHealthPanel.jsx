import React from 'react';

/** helpers */
function secondsToDhms(sec) {
  sec = Number(sec) || 0;
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length) parts.push(`${s}s`);
  return parts.join(' ');
}

function fmtBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024 * 1024) return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(0) + ' KB';
  return `${n} B`;
}

export default function RouterHealthPanel({ healthData = {} }) {
  // Accept array or object
  const data = Array.isArray(healthData) ? (healthData[0] || {}) : (healthData || {});
  const name = data.name || data.router || 'Router';

  // Uptime normalization:
  let uptimeRaw = data.uptime ?? data.Uptime ?? data.uptimeSeconds ?? data.uptime_secs ?? null;
  let uptime = '—';
  if (uptimeRaw !== null && uptimeRaw !== undefined && uptimeRaw !== '') {
    // if number -> seconds
    if (typeof uptimeRaw === 'number' || String(uptimeRaw).match(/^\d+$/)) {
      uptime = secondsToDhms(Number(uptimeRaw));
    } else if (String(uptimeRaw).includes('T')) {
      // possibly ISO timestamp saved as uptime anchor — treat as start time and compute elapsed
      const parsed = new Date(String(uptimeRaw).replace(' ', 'T'));
      if (!isNaN(parsed.getTime())) {
        const diffSec = Math.floor((Date.now() - parsed.getTime()) / 1000);
        uptime = diffSec > 0 ? secondsToDhms(diffSec) : String(uptimeRaw);
      } else {
        uptime = String(uptimeRaw);
      }
    } else {
      // other strings (e.g. "00:05:23" or "5 days")
      uptime = String(uptimeRaw);
    }
  }

  // CPU normalization: accept "24" or "24%" or numeric
  let cpuRaw = data.cpu ?? data.CPU ?? data.cpuPct ?? null;
  let cpuDisplay = '—';
  if (cpuRaw !== null && cpuRaw !== undefined && cpuRaw !== '') {
    const s = String(cpuRaw).trim();
    if (s.includes('%')) cpuDisplay = s;
    else if (!isNaN(Number(s))) cpuDisplay = `${Number(s)}%`;
    else cpuDisplay = s;
  }

  // Memory normalization: some feeds give percent <=100, some give raw bytes (big number), some give "1024 MB"
  let memRaw = data.memory ?? data.Memory ?? data.mem ?? null;
  let memoryDisplay = '—';
  if (memRaw !== null && memRaw !== undefined && memRaw !== '') {
    const s = String(memRaw).trim();
    if (s.includes('%')) {
      memoryDisplay = s;
    } else if (!isNaN(Number(s))) {
      const n = Number(s);
      if (n <= 100) {
        memoryDisplay = `${n}%`;
      } else {
        // treat as bytes
        memoryDisplay = fmtBytes(n);
      }
    } else {
      memoryDisplay = s;
    }
  }

  return (
    <div className="card router-health">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{name} Health</h3>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Uptime</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{uptime}</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#666' }}>CPU</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{cpuDisplay}</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#666' }}>Memory</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{memoryDisplay}</div>
        </div>
      </div>

      {/* Optional footer */}
      <div style={{ marginTop: 10, fontSize: 12, color: '#777' }}>
        Note: If values show “—”, the router health data is not available from backend.
      </div>
    </div>
  );
}
