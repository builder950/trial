// src/App.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchData } from './lib/api';
import { API_BASE_URL, SECRET_KEY } from './lib/constants';

import PaymentOverviewCard from './components/PaymentOverviewCard';
import BandwidthUsageChart from './components/BandwidthUsageChart';
import RouterHealthPanel from './components/RouterHealthPanel';
import ActiveSessionsTable from './components/ActiveSessionsTable';
import EditRowModal from './components/EditRowModal';

/**
 * Helper: format YYYY-MM-DD for date arithmetic
 */
function dateToKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** format MB number to human string (match server fmtMB behavior) */
function formatMB(mb) {
  if (!isFinite(mb) || mb === null || mb === undefined) return '0 MB';
  const n = Number(mb);
  if (n > 1024) return (n / 1024).toFixed(2) + ' GB';
  if (n > 1) return n.toFixed(2) + ' MB';
  return Math.round(n * 1024) + ' KB';
}

/**
 * adaptPaymentsResponse(resp)
 * Accepts either:
 *  - legacy array (or wrapper { data: [...] }) of rows
 *  - OR new grouped response: { userPaymentsByMonth, monthlySummary }
 *
 * Returns an object with legacy fields plus grouped/monthlySummary
 */
function adaptPaymentsResponse(resp) {
  const payload = resp && (resp.data || resp) ? (resp.data || resp) : null;

  const parseDateTime = (dateVal, timeVal) => {
    if (!dateVal && !timeVal) return null;
    try {
      if (dateVal && timeVal) {
        const d = new Date(`${String(dateVal)} ${String(timeVal)}`);
        if (!isNaN(d.getTime())) return d;
      }
      if (dateVal) {
        const d2 = new Date(String(dateVal));
        if (!isNaN(d2.getTime())) return d2;
      }
      if (timeVal) {
        const d3 = new Date(String(timeVal));
        if (!isNaN(d3.getTime())) return d3;
      }
    } catch (e) {}
    return null;
  };

  // grouped response (from code.gs)
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && (payload.userPaymentsByMonth || payload.monthlySummary)) {
    const grouped = payload.userPaymentsByMonth || {};
    const monthlySummary = payload.monthlySummary || {};

    // flatten to raw array of payments (and attach dateObj)
    const flatPayments = [];
    Object.entries(grouped).forEach(([phone, months]) => {
      Object.entries(months || {}).forEach(([monthKey, grp]) => {
        if (grp && Array.isArray(grp.payments)) {
          grp.payments.forEach(p => {
            const dateVal = p.date ?? p.DATE ?? monthKey;
            const timeVal = p.time ?? p.TIME ?? '';
            const dateObj = parseDateTime(dateVal, timeVal);
            flatPayments.push({
              name: p.name || p.NAME || '',
              phone: p.phone || p.PHONE || phone,
              amount: Number(p.amount ?? p.AMOUNT) || 0,
              date: dateVal,
              time: timeVal,
              txnId: p.txnId ?? p.TXNID ?? null,
              dateObj,
              __groupMonth: monthKey
            });
          });
        }
      });
    });

    // totals
    const todayISO = new Date().toISOString().slice(0, 10);
    let totalAll = 0;
    let todayTotal = 0;
    flatPayments.forEach(p => {
      totalAll += Number(p.amount || 0);
      try {
        if (p.date && String(p.date).slice(0, 10) === todayISO) todayTotal += Number(p.amount || 0);
      } catch (e) {}
    });

    // pick latest per phone (but keep the full flat list too)
    const byPhone = {};
    flatPayments.forEach(p => {
      const key = (p.phone || p.name || 'Unknown').toString();
      const ts = p.dateObj ? p.dateObj.getTime() : 0;
      if (!byPhone[key] || ts > (byPhone[key].__ts || 0)) byPhone[key] = { ...p, __ts: ts };
    });
    const latestPerClient = Object.values(byPhone).map(x => {
      const { __ts, ...rest } = x;
      return rest;
    }).sort((a, b) => (a.dateObj && b.dateObj ? b.dateObj.getTime() - a.dateObj.getTime() : 0));

    return {
      // legacy fields
      today: todayTotal,
      total: totalAll,
      pending: 0,
      // keep all recent (UI can limit if desired)
      recent: latestPerClient,
      rawRows: flatPayments,
      // richer objects
      grouped,
      monthlySummary
    };
  }

  // fallback legacy array
  const rows = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : []);
  if (!rows || !rows.length) {
    return { today: 0, total: 0, pending: 0, recent: [], rawRows: [], grouped: {}, monthlySummary: {} };
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  let totalAll = 0;
  let todayTotal = 0;
  let pendingCount = 0;
  const groups = {};

  rows.forEach(r => {
    const amount = Number(r.AMOUNT ?? r.amount ?? 0) || 0;
    totalAll += amount;

    const dateVal = r.DATE ?? r.date;
    const timeVal = r.TIME ?? r.time;
    const dt = parseDateTime(dateVal, timeVal);
    const iso = dt ? dt.toISOString().slice(0, 10) : null;
    if (iso === todayISO) todayTotal += amount;

    if (r.BALANCE === '' || r.BALANCE == null) pendingCount++;

    const phone = (r.PHONE || r.phone || '').toString().trim();
    const name = (r.NAME || r.name || '').toString().trim() || phone || 'Unknown';
    const key = phone || name;

    if (!groups[key]) groups[key] = [];
    groups[key].push({
      original: r,
      name,
      phone,
      amount,
      date: dateVal,
      time: timeVal,
      dateObj: dt,
      dt: dt ? dt.getTime() : (r.TIMESTAMP ? new Date(r.TIMESTAMP).getTime() : null)
    });
  });

  const latestPerClient = Object.keys(groups).map(k => {
    const list = groups[k].slice().sort((a, b) => (b.dt || 0) - (a.dt || 0));
    const latest = list[0];
    return {
      name: latest.name,
      phone: latest.phone,
      amount: latest.amount,
      date: latest.date,
      time: latest.time,
      dateObj: latest.dateObj,
      raw: latest.original
    };
  }).sort((a, b) => {
    const da = a.dateObj ? a.dateObj.getTime() : 0;
    const db = b.dateObj ? b.dateObj.getTime() : 0;
    return db - da;
  });

  return {
    today: todayTotal,
    total: totalAll,
    pending: pendingCount,
    recent: latestPerClient,
    rawRows: rows,
    grouped: {},
    monthlySummary: {}
  };
}

function App() {
  // cached state seeds
  const cachedPayments = JSON.parse(localStorage.getItem('starnet_cache_payments') || 'null');
  const cachedUsage = JSON.parse(localStorage.getItem('starnet_cache_usage') || 'null');
  const cachedIface = JSON.parse(localStorage.getItem('starnet_cache_iface') || 'null');
  const cachedRouter = JSON.parse(localStorage.getItem('starnet_cache_router') || 'null');

  const [paymentsData, setPaymentsData] = useState(cachedPayments || {});
  const [usageSummary, setUsageSummary] = useState(cachedUsage || { daily: [], summary: [] });
  const [interfaceStats, setInterfaceStats] = useState(cachedIface || { latest: [], totals: {} });
  const [routerHealth, setRouterHealth] = useState(cachedRouter || {});
  const [loading, setLoading] = useState(!cachedUsage);
  const [error, setError] = useState(null);

  // per-endpoint displayable errors
  const [endpointErrors, setEndpointErrors] = useState({}); // { payments: 'msg', user_usage: 'msg', ... }

  const [lastUpdated, setLastUpdated] = useState(cachedUsage ? new Date(localStorage.getItem('starnet_cache_updated')) : null);
  const [dataVersion, setDataVersion] = useState(0);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editSheet, setEditSheet] = useState('payments');

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientWeek, setClientWeek] = useState([]);

  // Use separate state for endpoint loading status
  const [endpointLoading, setEndpointLoading] = useState({
    payments: !cachedPayments,
    user_usage: !cachedUsage,
    interface_stats: !cachedIface,
    router_health: !cachedRouter
  });

  // store consecutive failure counts per endpoint to avoid flicker
  const abortControllers = useRef({});
  const endpointFailureCounts = useRef({});

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false }, []);

  const applyTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };
  useEffect(() => { applyTheme(darkMode); }, [darkMode]);

  function normalizeIfaceTotals(rawTotals = {}) {
    const rxMB = Number(rawTotals.RX_MB ?? rawTotals.RX ?? rawTotals.rx ?? 0) || 0;
    const txMB = Number(rawTotals.TX_MB ?? rawTotals.TX ?? rawTotals.tx ?? 0) || 0;
    return {
      ...rawTotals,
      RX_MB: rxMB,
      TX_MB: txMB,
      RX_HUMAN: rawTotals.RX_HUMAN || formatMB(rxMB),
      TX_HUMAN: rawTotals.TX_HUMAN || formatMB(txMB),
      RX: rawTotals.RX || formatMB(rxMB),
      TX: rawTotals.TX || formatMB(txMB)
    };
  }

  function normalizeRouterHealth(routerResp) {
    if (!routerResp) return {};
    if (routerResp.data && typeof routerResp.data === 'object' && !Array.isArray(routerResp.data)) return routerResp.data;
    if (routerResp.data && Array.isArray(routerResp.data) && routerResp.data.length) {
      const row = routerResp.data[0];
      return { uptime: row.Uptime || row.uptime || row.Timestamp || '—', cpu: row.CPU || row.cpu || '—', memory: row.Memory || row.memory || '—', rawRow: row };
    }
    if (routerResp.uptime || routerResp.Uptime || routerResp.cpu || routerResp.memory) {
      return { uptime: routerResp.Uptime || routerResp.uptime || '—', cpu: routerResp.CPU || routerResp.cpu || '—', memory: routerResp.Memory || routerResp.memory || '—', rawRow: routerResp };
    }
    return routerResp || {};
  }

  // New staggered loading approach
  const loadEndpoint = useCallback(async (endpointKey, background = false) => {
    // Skip if in background mode and endpoint has no failures
    if (background && (endpointFailureCounts.current[endpointKey] || 0) === 0) {
      return;
    }

    // Abort previous request if exists
    if (abortControllers.current[endpointKey]) {
      abortControllers.current[endpointKey].abort();
    }
    
    const controller = new AbortController();
    abortControllers.current[endpointKey] = controller;

    try {
      if (!background) {
        setEndpointLoading(prev => ({ ...prev, [endpointKey]: true }));
      }
      
      const resp = await fetchData(endpointKey, { signal: controller.signal });
      
      // Reset failure count on success
      endpointFailureCounts.current[endpointKey] = 0;
      
      // Process response based on endpoint type
      switch (endpointKey) {
        case 'payments':
          {
            const adapted = adaptPaymentsResponse(resp);
            setPaymentsData(adapted);
            localStorage.setItem('starnet_cache_payments', JSON.stringify(adapted));
          }
          break;
        case 'user_usage':
          setUsageSummary({ daily: resp.daily || [], summary: resp.summary || [] });
          localStorage.setItem('starnet_cache_usage', JSON.stringify({ 
            daily: resp.daily || [], 
            summary: resp.summary || [] 
          }));
          break;
        case 'interface_stats':
          {
            const ifaceLatest = resp.latest || [];
            const ifaceTotals = normalizeIfaceTotals(resp.totals || {});
            setInterfaceStats({ latest: ifaceLatest, totals: ifaceTotals });
            localStorage.setItem('starnet_cache_iface', JSON.stringify({ 
              latest: ifaceLatest, 
              totals: ifaceTotals 
            }));
          }
          break;
        case 'router_health':
          {
            const normalizedRouter = normalizeRouterHealth(resp);
            setRouterHealth(normalizedRouter);
            localStorage.setItem('starnet_cache_router', JSON.stringify(normalizedRouter));
          }
          break;
        default:
          break;
      }
      
      // Update last updated time
      const now = new Date();
      setLastUpdated(now);
      localStorage.setItem('starnet_cache_updated', now.toISOString());
      setDataVersion(v => v + 1);
      
      // Clear any existing error for this endpoint
      setEndpointErrors(prev => ({ ...prev, [endpointKey]: undefined }));
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Skip error handling for aborted requests
      }
      
      // Update failure count
      endpointFailureCounts.current[endpointKey] = (endpointFailureCounts.current[endpointKey] || 0) + 1;
      
      const message = err.message || String(err);
      setEndpointErrors(prev => ({ ...prev, [endpointKey]: message }));
    } finally {
      if (!background) {
        setEndpointLoading(prev => ({ ...prev, [endpointKey]: false }));
      }
    }
  }, []);

  // Initial load and polling setup
  useEffect(() => {
    const initialLoad = async () => {
      // Stagger initial requests to avoid flooding
      await loadEndpoint('payments');
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadEndpoint('user_usage');
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadEndpoint('interface_stats');
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadEndpoint('router_health');
    };

    initialLoad();

    // Set up independent polling intervals
    const paymentsInterval = setInterval(() => loadEndpoint('payments', true), 15000);
    const usageInterval = setInterval(() => loadEndpoint('user_usage', true), 20000);
    const ifaceInterval = setInterval(() => loadEndpoint('interface_stats', true), 25000);
    const routerInterval = setInterval(() => loadEndpoint('router_health', true), 30000);

    // Cleanup function
    return () => {
      clearInterval(paymentsInterval);
      clearInterval(usageInterval);
      clearInterval(ifaceInterval);
      clearInterval(routerInterval);
      
      // Abort all ongoing requests
      Object.values(abortControllers.current).forEach(controller => {
        controller.abort();
      });
    };
  }, [loadEndpoint]);

  // Retry only failed endpoints
  const handleRetry = useCallback(() => {
    Object.entries(endpointErrors).forEach(([endpoint]) => {
      if (endpointErrors[endpoint]) {
        loadEndpoint(endpoint);
      }
    });
  }, [endpointErrors, loadEndpoint]);

  // POST helper
  async function postRow(sheetKey, rowObj) {
    const url = `${API_BASE_URL}?key=${encodeURIComponent(SECRET_KEY)}&sheet=${encodeURIComponent(sheetKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row: rowObj })
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt || ''}`);
    }
    const json = await res.json().catch(()=>null);
    if (json && json.error) throw new Error(json.error);
    return json;
  }

  function handleEdit(row, sheetKey = 'interface_stats') {
    setEditRow(row || {});
    setEditSheet(sheetKey);
    setEditOpen(true);
  }

  async function handleSave(editedRow) {
    try {
      await postRow(editSheet, editedRow);
      await loadEndpoint(editSheet, true);
    } catch (err) {
      console.error('Save error', err);
      throw err;
    } finally {
      setEditOpen(false);
      setEditRow(null);
    }
  }

  // client modal
  async function openClientModal(clientUser) {
    setSelectedClient(clientUser);
    setClientModalOpen(true);
    try {
      const days = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(dateToKey(d));
      }
      const promises = days.map(dt => fetchData('user_usage', { date: dt, maxSamples: 5 }));
      const results = await Promise.allSettled(promises);
      const week = results.map((r, idx) => {
        if (r.status === 'fulfilled') {
          const found = (r.value.daily || []).find(x => x.user === clientUser);
          return {
            date: days[idx],
            totalRx: found ? found.totalRx : 0,
            totalTx: found ? found.totalTx : 0,
            totalRxHuman: found ? found.totalRxHuman : '0 MB',
            totalTxHuman: found ? found.totalTxHuman : '0 MB'
          };
        } else {
          return {
            date: days[idx],
            totalRx: 0,
            totalTx: 0,
            totalRxHuman: '0 MB',
            totalTxHuman: '0 MB'
          };
        }
      });
      setClientWeek(week);
    } catch (err) {
      console.error('fetch client week error', err);
      setClientWeek([]);
    }
  }
  function closeClientModal() {
    setClientModalOpen(false);
    setSelectedClient(null);
    setClientWeek([]);
  }

  const usageDaily = usageSummary?.daily || [];
  const usageSummaryCompact = usageSummary?.summary || [];

  // UI small helper: compose endpoint error text
  const endpointErrorLines = Object.entries(endpointErrors).map(([k, v]) => `${k}: ${v}`).filter(Boolean).join(' · ');

  // Show loading if *any* endpoint is loading and not all endpoints are loaded
  const anyEndpointLoading = Object.values(endpointLoading).some(Boolean);

  return (
    <div className={`min-h-screen p-6 transition-colors duration-700 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">🚀 STARNET Network Dashboard</h1>
          <p className="text-sm opacity-70 mt-1">Per-user daily totals + interface overview</p>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm opacity-80 mr-2">Last updated: <strong>{lastUpdated.toLocaleTimeString()}</strong></span>
          )}

          <button
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 hover:scale-105 transform transition"
            onClick={() => setDarkMode(prev => !prev)}
            aria-label="Toggle theme"
          >
            {darkMode ? '🌞 Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* Top-level errors / partial failures */}
      {error && (
        <div className="mb-4 rounded p-3 bg-red-50 text-red-700 border border-red-100">
          <div className="flex items-center justify-between">
            <div><strong>Error:</strong> {error}</div>
            <div>
              <button className="px-2 py-1 text-sm border rounded" onClick={handleRetry}>Retry</button>
            </div>
          </div>
        </div>
      )}

      {/* Endpoint-level warnings (partial failures) */}
      {Object.keys(endpointErrors).filter(k => endpointErrors[k]).length > 0 && (
        <div className="mb-4 rounded p-3 bg-yellow-50 text-yellow-800 border border-yellow-100">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">Partial data: {endpointErrorLines}</div>
            <div>
              <button className="px-2 py-1 text-sm border rounded" onClick={handleRetry}>Retry failed</button>
            </div>
          </div>
        </div>
      )}

      {anyEndpointLoading && (
        <div className="text-center my-6 animate-pulse">Loading data…</div>
      )}

      {/* Top cards: Router & Interfaces (payments moved to bottom) */}
      <div key={`cards-${dataVersion}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl shadow-lg p-4 bg-white dark:bg-gray-800">
          <RouterHealthPanel healthData={routerHealth} />
        </div>

        <div className="rounded-xl shadow-lg p-4 bg-white dark:bg-gray-800">
          <ActiveSessionsTable
            data={interfaceStats.latest}
            totals={interfaceStats.totals}
            onEdit={(row) => handleEdit(row, 'interface_stats')}
          />
        </div>
      </div>

      {/* Usage chart */}
      <div key={`usage-${dataVersion}`} className="rounded-xl shadow-lg p-4 bg-white dark:bg-gray-800 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Today's usage</h2>
          <div className="text-sm opacity-70">Users: {usageDaily.length}</div>
        </div>

        <BandwidthUsageChart
          data={usageDaily.length ? usageDaily : usageSummaryCompact}
          onUserClick={(user) => openClientModal(user)}
          showAll={true}
        />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs opacity-70 border-b">
              <tr>
                <th className="py-2">User</th>
                <th className="py-2">RX</th>
                <th className="py-2">TX</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(usageDaily.length ? usageDaily : usageSummaryCompact).map((u) => (
                <tr key={u.user} className="hover:bg-gray-50 dark:hover:bg-gray-900/60">
                  <td className="py-2 font-medium">{u.user}</td>
                  <td className="py-2">{u.totalRxHuman || (u.last && u.last.RX_MB ? formatMB(u.last.RX_MB) : '—')}</td>
                  <td className="py-2">{u.totalTxHuman || (u.last && u.last.TX_MB ? formatMB(u.last.TX_MB) : '—')}</td>
                  <td className="py-2">
                    <button
                      className="text-sm px-2 py-1 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => openClientModal(u.user)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      <EditRowModal
        open={editOpen}
        rowData={editRow}
        onClose={() => { setEditOpen(false); setEditRow(null); }}
        onSave={handleSave}
      />

      {/* Client history modal */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeClientModal} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 z-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">History — {selectedClient}</h3>
              <div>
                <button className="px-3 py-1 rounded border" onClick={closeClientModal}>Close</button>
              </div>
            </div>

            <div className="mb-3 text-sm opacity-80">
              Last 7 days (per-day totals). Empty days are zero.
            </div>

            <div className="space-y-2">
              {clientWeek.length === 0 && <div className="text-sm opacity-70">Loading week data…</div>}
              {clientWeek.map(d => (
                <div key={d.date} className="flex justify-between items-center p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <div className="font-medium">{d.date}</div>
                  <div className="text-sm opacity-80">{d.totalRxHuman} / {d.totalTxHuman}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payments moved to bottom */}
      <div key={`payments-${dataVersion}`} className="rounded-xl shadow-lg p-4 bg-white dark:bg-gray-800 mt-6">
        {/* Pass entire paymentsData (includes grouped/monthlySummary/rawRows) */}
        <PaymentOverviewCard data={paymentsData} />
      </div>
    </div>
  );
}

export default App;
