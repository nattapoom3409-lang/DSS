const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function request(path) {
  const response = await fetch(`${API_URL}/api${path}`);
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try { message = (await response.json()).error || message; } catch { /* keep status message */ }
    throw new Error(message);
  }
  return response.json();
}

export const api = {
  overview: () => request('/overview'),
  provincesYearly: () => request('/provinces/yearly'),
  indicators: () => request('/indicators'),
  ranking: (params = '') => request(`/ranking${params ? `?${params}` : ''}`),
  tables: () => request('/tables'),
  table: (name, query) => request(`/tables/${encodeURIComponent(name)}?${query}`),
  url: (path) => `${API_URL}/api${path}`,
};
