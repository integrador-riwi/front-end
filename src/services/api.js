const API_BASE_URL = 'https://back-end-production-7f2c.up.railway.app/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Error en la petición');
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
}

// Auth
export async function loginUser(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function logoutUser() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return apiFetch('/auth/me', { method: 'GET' });
}

export async function refreshTokens() {
  return apiFetch('/auth/refresh', { method: 'POST' });
}

// Teams 
/**
 * Returns the team the user belongs to, or throws if they have none.
 * Backend: GET /users/:id/team
 */
/* export async function getUserTeam(userId) {
  return apiFetch(`/users/${userId}/team`, { method: 'GET' });
} */
