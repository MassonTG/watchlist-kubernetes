const API = '/api';

async function request(method, path, body = null) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || 'Помилка сервера');
  return data;
}

const api = {
  register:    (email, password) => request('POST', '/auth/register', { email, password }),
  login:       (email, password) => request('POST', '/auth/login', { email, password }),
  getMedia:    (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/media${q ? '?' + q : ''}`);
  },
  createMedia: (data) => request('POST', '/media', data),
  updateMedia: (id, data) => request('PUT', `/media/${id}`, data),
  deleteMedia: (id) => request('DELETE', `/media/${id}`),
  quickReview: (id, data) => request('PATCH', `/media/${id}/review`, data),
};