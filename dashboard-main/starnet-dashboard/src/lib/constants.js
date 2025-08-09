// src/lib/constants.js
// Vite-style env variables (import.meta.env.VITE_*)
// NOTE: keep the secret raw here; we encode when building the URL in api.js

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || '';

// Dev-time warnings (remove in prod)
if (!API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[config] VITE_API_BASE_URL is not set. Add it to .env at project root.');
}
if (!SECRET_KEY) {
  // eslint-disable-next-line no-console
  console.warn('[config] VITE_SECRET_KEY is not set. Add it to .env at project root.');
}

export default { API_BASE_URL, SECRET_KEY };
