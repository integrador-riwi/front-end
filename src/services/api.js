const API_BASE_URL = "https://back-end-production-7f2c.up.railway.app/api";

function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || data.error || "Error en la petición",
    );
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
}

// Auth
export async function loginUser(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function logoutUser() {
  return apiFetch("/auth/logout", { method: "POST" });
}

export async function getMe() {
  return apiFetch("/auth/me", { method: "GET" });
}

export async function refreshTokens() {
  return apiFetch("/auth/refresh", { method: "POST" });
}

// Teams
/**
 * Returns the team the user belongs to, or throws if they have none.
 * Backend: GET /users/:id/team
 */
/* export async function getUserTeam(userId) {
  return apiFetch(`/users/${userId}/team`, { method: 'GET' });
} */

export async function createTeam(teamData) {
  const payload =
    typeof teamData === "string" ? { name: teamData } : { ...teamData };

  if (payload.name) {
    payload.name = payload.name.trim();
  }

  return apiFetch("/teams", {
    method: "POST",
    body: payload,
  });
}

export async function getMyProfile() {
  const response = await apiFetch("/auth/me", { method: "GET" });
  return response.data ?? response;
}

export async function updateProfile(profileData = {}) {
  const response = await apiFetch("/auth/profile", {
    method: "PUT",
    body: profileData,
  });

  return response.data ?? response;
}

export async function getGithubStatus() {
  const response = await apiFetch("/auth/github/status", { method: "GET" });
  return response.data ?? response;
}

export async function getGithubAuthUrl() {
  const response = await apiFetch("/auth/github/url", { method: "GET" });
  return response.data?.url ?? response.url ?? null;
}

// Events
export async function getEvents() {
  return apiFetch("/events", { method: "GET" });
}

// Invitations
export async function getAvailableCoders(teamId, search = "") {
  const url = `/teams/${teamId}/available?search=${encodeURIComponent(search)}&limit=20`;
  return apiFetch(url, { method: "GET" });
}

export async function inviteMember(teamId, userId) {
  return apiFetch(`/teams/${teamId}/members`, {
    method: "POST",
    body: { userId, role: "DEVELOPER" },
  });
}

export async function acceptInvitation(invitationId) {
  return apiFetch(`/teams/invitations/${invitationId}/accept`, {
    method: "POST",
  });
}

export async function rejectInvitation(invitationId) {
  return apiFetch(`/teams/invitations/${invitationId}/reject`, {
    method: "POST",
  });
}

export async function leaveTeam(teamId) {
  return apiFetch(`/teams/${teamId}/leave`, { method: "DELETE" });
}

// Join Requests
export async function requestToJoinTeam(teamId) {
  return apiFetch(`/teams/${teamId}/request-join`, {
    method: "POST",
  });
}

export async function getTeamJoinRequests(teamId) {
  return apiFetch(`/teams/${teamId}/join-requests`, { method: "GET" });
}

export async function getMyJoinRequests() {
  return apiFetch("/teams/join-requests/my", { method: "GET" });
}

export async function acceptJoinRequest(requestId) {
  return apiFetch(`/teams/join-requests/${requestId}/accept`, {
    method: "POST",
  });
}

export async function rejectJoinRequest(requestId) {
  return apiFetch(`/teams/join-requests/${requestId}/reject`, {
    method: "POST",
  });
}

export async function cancelJoinRequest(requestId) {
  return apiFetch(`/teams/join-requests/${requestId}/cancel`, {
    method: "DELETE",
  });
}

// AI - Similar Projects Search
export async function updateTeam(teamId, data) {
  return apiFetch(`/teams/${teamId}`, {
    method: "PUT",
    body: data,
  });
}

export async function updateProject(projectId, data) {
  return apiFetch(`/projects/${projectId}`, {
    method: "PUT",
    body: data,
  });
}

export async function removeMember(teamId, userId) {
  return apiFetch(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

export async function searchSimilarProjects(
  query,
  limit = 3,
  minSimilarity = 0.7,
  excludeProjectId = null,
) {
  let url = `/teams/search?q=${encodeURIComponent(query)}&limit=${limit}&min_similarity=${minSimilarity}`;
  if (excludeProjectId) {
    url += `&exclude_project=${excludeProjectId}`;
  }
  return apiFetch(url, { method: "GET" });
}
