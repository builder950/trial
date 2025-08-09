// src/lib/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;

/**
 * fetchDataRaw(sheetKey, params)
 * - params: optional object -> appended as query params (e.g. { date: '2025-08-08', maxSamples: 5 })
 */
export async function fetchDataRaw(sheetKey, params = {}) {
  if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL not set');
  if (!SECRET_KEY) throw new Error('VITE_SECRET_KEY not set');

  const url = new URL(API_BASE_URL);
  url.searchParams.set('key', SECRET_KEY);
  url.searchParams.set('sheet', sheetKey);

  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const res = await fetch(String(url), { method: 'GET' });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json().catch(() => {
    throw new Error('Invalid JSON from backend');
  });

  return json; // raw backend JSON
}

/**
 * Convenience wrapper that normalizes responses into a predictable shape:
 * { sheet, data, summary, daily, latest, totals }
 */
export async function fetchData(sheetKey, params = {}) {
  const json = await fetchDataRaw(sheetKey, params);

  if (!json || typeof json !== 'object') {
    return { sheet: sheetKey, data: [], summary: [], daily: [], latest: [], totals: {} };
  }

  return {
    sheet: json.sheet || sheetKey,
    data: json.data || [],
    summary: json.summary || [],
    daily: json.daily || [],
    latest: json.latest || [],
    totals: json.totals || {}
  };
}
