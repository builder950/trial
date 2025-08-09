import React, { useState, useMemo } from 'react';

/** Format MB numeric -> human (MB with 2 decimals or KB) */
function fmtMbHuman(mb) {
  const n = Number(mb) || 0;
  if (n >= 1024) return (n / 1024).toFixed(2) + ' GB';
  if (n >= 1) return n.toFixed(2) + ' MB';
  return Math.round(n * 1024) + ' KB';
}

/** parse timestamp safely */
function parseTs(ts) {
  if (!ts) return null;
  const s = String(ts).trim().replace(' ', 'T');
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * ActiveSessionsTable
 * Props:
 *  - data: array of interface/session rows (expected shape: { Interface, RX_MB, TX_MB, Timestamp, ... })
 *  - totals: optional totals object
 *  - onEdit: function(row) to open edit modal
 */
export default function ActiveSessionsTable({ data = [], totals = {}, onEdit = () => {} }) {
  const rows = Array.isArray(data) ? data : [];
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('RX_MB');
  const [desc, setDesc] = useState(true);

  // Normalize totals for display: prefer RX_HUMAN/TX_HUMAN or RX/TX strings, fallback to numeric MB
  function totalsToDisplay(t) {
    if (!t) return { rxStr: '0 MB', txStr: '0 MB', rxMB: 0, txMB: 0 };
    const rxMB = Number(t.RX_MB ?? t.RX ?? t.rx ?? 0) || 0;
    const txMB = Number(t.TX_MB ?? t.TX ?? t.tx ?? 0) || 0;
    const rxStr = t.RX_HUMAN || t.RX || (rxMB !== 0 ? fmtMbHuman(rxMB) : '0 MB');
    const txStr = t.TX_HUMAN || t.TX || (txMB !== 0 ? fmtMbHuman(txMB) : '0 MB');
    return { rxStr, txStr, rxMB, txMB };
  }

  const totalsDisp = totalsToDisplay(totals);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = rows.slice();

    if (s) {
      list = list.filter(r => {
        // include human-formats and values too
        const values = {
          ...r,
          RX_HUMAN: r.RX_HUMAN || (r.RX_MB !== undefined ? fmtMbHuman(r.RX_MB) : ''),
          TX_HUMAN: r.TX_HUMAN || (r.TX_MB !== undefined ? fmtMbHuman(r.TX_MB) : '')
        };
        return Object.values(values).some(v => String(v || '').toLowerCase().includes(s));
      });
    }

    list.sort((a,b) => {
      // sort numeric if keys are RX_MB/TX_MB, else string compare
      if (sortKey === 'RX_MB' || sortKey === 'TX_MB') {
        const av = Number(a[sortKey] ?? 0);
        const bv = Number(b[sortKey] ?? 0);
        return desc ? bv - av : av - bv;
      }
      const avs = String(a[sortKey] ?? '');
      const bvs = String(b[sortKey] ?? '');
      return desc ? bvs.localeCompare(avs) : avs.localeCompare(bvs);
    });

    return list;
  }, [rows, search, sortKey, desc]);

  return (
    <div className="card sessions-table">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Active Sessions</h3>
        <div style={{ fontSize: 13, color: '#666' }}>
          Totals: RX {totalsDisp.rxStr} · TX {totalsDisp.txStr}
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Search user / interface"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 8px', flex: 1 }}
        />
        <select value={sortKey} onChange={e => setSortKey(e.target.value)}>
          <option value="RX_MB">RX_MB</option>
          <option value="TX_MB">TX_MB</option>
          <option value="Interface">Interface</option>
        </select>
        <button onClick={() => setDesc(d => !d)}>{desc ? 'Desc' : 'Asc'}</button>
      </div>

      <div style={{ marginTop: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ color: '#777' }}>No active sessions found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ textAlign: 'left', fontSize: 12, color: '#444' }}>
              <tr>
                <th>Interface</th>
                <th>RX</th>
                <th>TX</th>
                <th>Timestamp</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const iface = r.Interface || r.iface || r.interface || '—';
                const rxMB = Number(r.RX_MB ?? r.RX ?? 0) || 0;
                const txMB = Number(r.TX_MB ?? r.TX ?? 0) || 0;
                const rxHuman = r.RX_HUMAN || fmtMbHuman(rxMB);
                const txHuman = r.TX_HUMAN || fmtMbHuman(txMB);
                const ts = parseTs(r.Timestamp || r.Time || r.timestamp);
                return (
                  <tr key={iface + '-' + idx} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px' }}>{iface}</td>
                    <td style={{ padding: '6px 8px' }}>{rxHuman}</td>
                    <td style={{ padding: '6px 8px' }}>{txHuman}</td>
                    <td style={{ padding: '6px 8px' }}>{ts ? ts.toLocaleString() : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <button onClick={() => onEdit(r)}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
