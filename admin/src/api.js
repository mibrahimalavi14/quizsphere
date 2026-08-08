const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('qs_admin_token');
}

function setToken(token) {
  if (token) localStorage.setItem('qs_admin_token', token);
  else localStorage.removeItem('qs_admin_token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('qs_admin_user'));
  } catch {
    return null;
  }
}

function setUser(user) {
  if (user) localStorage.setItem('qs_admin_user', JSON.stringify(user));
  else localStorage.removeItem('qs_admin_user');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { getToken, setToken, getUser, setUser };
