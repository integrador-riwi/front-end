const API_BASE_URL = "https://api-teamup.duckdns.org/api";
// const API_BASE_URL =
    // import.meta.env.VITE_API_URL || "https://api-teamup.duckdns.org/";

function getToken() {
  return localStorage.getItem("token");
}

let _isRefreshing = false;
let _refreshQueue = [];

function _processQueue(error, token = null) {
  _refreshQueue.forEach(({ resolve, reject }) =>
      error ? reject(error) : resolve(token)
  );
  _refreshQueue = [];
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  if (response.status === 204) return null;

  // 401 — intentar renovar con el refreshToken de localStorage
  if (response.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login") {
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        return apiFetch(endpoint, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
        });
      });
    }

    _isRefreshing = true;

    try {
      const { getRefreshToken, setToken, setRefreshToken, clearAuth } = await import("../utils/auth.js");
      const refreshToken = getRefreshToken();

      if (!refreshToken) throw new Error("No refresh token");

      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshRes.ok) throw new Error("Refresh failed");

      const refreshData = await refreshRes.json();
      const newToken = refreshData?.data?.token ?? refreshData?.token;
      const newRefreshToken = refreshData?.data?.refreshToken ?? refreshData?.refreshToken;

      if (!newToken) throw new Error("No token in refresh response");

      setToken(newToken);
      if (newRefreshToken) setRefreshToken(newRefreshToken);

      _processQueue(null, newToken);

      // Reintentar la request original con el nuevo token
      return apiFetch(endpoint, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      });

    } catch (refreshError) {
      _processQueue(refreshError);
      const { clearAuth } = await import("../utils/auth.js");
      clearAuth();
      window.location.href = "/";
      throw refreshError;
    } finally {
      _isRefreshing = false;
    }
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || data.error || "Error en la petición");
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
}

// Auth
const REGISTER_API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3010/api";

export async function loginUser(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function registerUser(payload) {
  return apiFetch(`${REGISTER_API_BASE_URL}/auth/register`, {
    method: "POST",
    body: payload,
  });
}

export async function createQR(id_event, expires_at, finalists) {
  return apiFetch("/qr-votes", {
    method: "POST",
    body: {
      id_event,
      expires_at,
      top_n: finalists.length,
      finalist_ids: finalists.map((f) => f.id_project).filter(Boolean),
      vote_type: "PUBLIC",
    },
  });
}

export async function createStaffQR(id_event, expires_at, finalists) {
  return apiFetch("/qr-votes", {
    method: "POST",
    body: {
      id_event,
      expires_at,
      top_n: finalists.length,
      finalist_ids: finalists.map((f) => f.id_project).filter(Boolean),
      vote_type: "STAFF",
    },
  });
}

export async function getQR(id_event) {
  return apiFetch(`/qr-votes/event/${id_event}`, {
    method: "GET",
  });
}

export async function getQRImage(id_event) {
  return apiFetch(`/qr-votes/event/${id_event}/image`, {
    method: "GET",
  });
}

export async function checkCedulaVoted(qrVoteId, documento) {
  return apiFetch(`/qr-votes/vote/${qrVoteId}/check-cedula?documento=${encodeURIComponent(documento)}`, {
    method: "GET",
  });
}

export async function getQRImageById(qr_id) {
  return apiFetch(`/qr-votes/${qr_id}/image`, {
    method: "GET",
  });
}

export async function toggleQR(qr_id) {
  return apiFetch(`/qr-votes/${qr_id}/toggle`, {
    method: "PATCH",
  });
}

export async function getVotingProjects(id_event) {
  return apiFetch(`/qr-votes/vote/${id_event}/projects`, {
    method: "GET"})
}

export async function getStaffVotingProjects(staffToken) {
  return apiFetch(`/qr-votes/vote/staff/${staffToken}/projects`, {
    method: "GET"})
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

export async function getVoteResults(eventId) {
  const response = await apiFetch(`/qr-votes/event/${eventId}/results`, { method: "GET" });
  return response?.data ?? response;
}

// Teams
/**
 * Returns the team the user belongs to, or throws if they have none.
 * Backend: GET /users/:id/team
 */
/* export async function getUserTeam(userId) {
  return apiFetch(`/users/${userId}/team`, { method: 'GET' });
} */

export async function getMyTeams() {
  const response = await apiFetch("/teams/my-teams");
  return response.data;
}

export async function getTeamsByEvent(eventId) {
  const response = await apiFetch(`/teams?idEvent=${eventId}`, {
    method: "GET",
  });

  return response.data ?? response;
}

export async function getEventById(eventId) {
  const response = await apiFetch(`/events/${eventId}`,
      {method: 'GET'});

  return response.data
}

export async function submitVote(qr_vote_id, project_id, voter_token, podium = [], identity = {}) {
  return apiFetch(`/qr-votes/vote`, {
    method: "POST",
    body: {
      qr_vote_id,
      project_id,
      voter_token,
      podium,
      voter_documento: identity.documento ?? null,
      voter_nombre:    identity.nombre    ?? null,
    },
  });
}

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

export const getTeams = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.idEvent) query.append('idEvent', params.idEvent);
  if (params.includeSubmitted !== undefined) query.append('includeSubmitted', params.includeSubmitted);
  if (params.includeClosed !== undefined) query.append('includeClosed', params.includeClosed);
  const queryStr = query.toString() ? `?${query.toString()}` : '';
  const response = await apiFetch(`/teams${queryStr}`, { method: 'GET' });
  return response.data ?? response;
};

export async function getMyProfile() {
  const response = await apiFetch("/auth/me", { method: "GET" });
  return response.data ?? response;
}

export async function getPublicProfile(userId) {
  const response = await apiFetch(`/users/${userId}/profile`, { method: "GET" });
  const outer = response.data ?? response;
  // Handle double-nested response: { success, data: { ...profile } }
  // vs { success, data: { data: { ...profile } } }
  if (outer.data && typeof outer.data === "object" && outer.data.id_user) {
    return outer.data;
  }
  return outer;
}

export const getUsers = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.role) query.append('role', params.role);
  if (params.clan) query.append('clan', params.clan);
  if (params.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  return apiFetch(`/users?${query.toString()}`, { method: 'GET' });
};

export const createUser = async (payload) => {
  return apiFetch('/users', {
    method: 'POST',
    body: payload,
  });
};

export const updateUser = async (userId, payload) => {
  return apiFetch(`/users/${userId}`, {
    method: 'PUT',
    body: payload,
  });
};

export const updateUserPassword = async (userId, password) => {
  return apiFetch(`/users/${userId}/password`, {
    method: 'PUT',
    body: { password },
  });
};

export const updateUserStatus = async (userId, isActive) => {
  return apiFetch(`/users/${userId}/status`, {
    method: 'PUT',
    body: { isActive },
  });
};

export const deleteUser = async (userId) => {
  return apiFetch(`/users/${userId}`, { method: 'DELETE' });
};

export const sendWelcomeEmailsToUsers = async (payload) => {
  // payload: { userIds: [1, 2], clan: "Riwi-io-Medellin" }
  return apiFetch('/users/welcome-email', {
    method: 'POST',
    body: payload,
  });
};

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

export async function getGithubOrgs() {
  const response = await apiFetch("/auth/github/orgs", { method: "GET" });
  return response.data ?? response;
}

// Events
export async function getEvents() {
  return apiFetch("/events", { method: "GET" });
}

export async function getActiveEvents() {
  return apiFetch("/events/active", { method: "GET" });
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

// Comments
export async function getComments(projectId) {
  const response = await apiFetch(`/comments/project/${projectId}`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function postComment({
                                    projectId,
                                    comment,
                                    parentCommentId = null,
                                  }) {
  const response = await apiFetch("/comments", {
    method: "POST",
    body: { projectId, comment, parentCommentId },
  });
  return response?.data ?? response;
}

export async function deleteComment(commentId) {
  return apiFetch(`/comments/${commentId}`, { method: "DELETE" });
}

// Evaluations (TL only)
export async function getRubricsByEvent(eventId) {
  const response = await apiFetch(`/evaluations/rubrics/${eventId}`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function submitEvaluations(projectId, evaluations) {
  const response = await apiFetch(`/evaluations/project/${projectId}`, {
    method: "POST",
    body: { evaluations },
  });
  return response?.data ?? response;
}

export async function calculateProjectGrades(projectId) {
  const response = await apiFetch(
      `/evaluations/project/${projectId}/calculate`,
      { method: "POST" },
  );
  return response?.data ?? response;
}

export async function getProjectResultsSummary(projectId) {
  const response = await apiFetch(`/evaluations/project/${projectId}/results/summary`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function getMyEvaluationsForProject(projectId) {
  const response = await apiFetch(`/evaluations/project/${projectId}/my`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function getMyEvaluationSummaryForProject(projectId) {
  const response = await apiFetch(`/evaluations/project/${projectId}/my/summary`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function getProjectEvalStatus(projectId) {
  const response = await apiFetch(`/evaluations/project/${projectId}/eval-status`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function getEventEvalCoverage(eventId) {
  const response = await apiFetch(`/evaluations/event/${eventId}/coverage`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function getTeamEvalCounts(eventId) {
  const response = await apiFetch(`/evaluations/event/${eventId}/team-eval-counts`, {
    method: "GET",
  });
  return response?.data ?? response;
}

export async function closeEventEvaluations(eventId) {
  const response = await apiFetch(`/evaluations/event/${eventId}/close`, {
    method: "POST",
  });
  return response?.data ?? response;
}

export async function reopenEventEvaluations(eventId) {
  const response = await apiFetch(`/evaluations/event/${eventId}/reopen`, {
    method: "POST",
  });
  return response?.data ?? response;
}
export async function updateTeam(teamId, data) {
  return apiFetch(`/teams/${teamId}`, {
    method: "PUT",
    body: data,
  });
}

export async function closeTeam(teamId) {
  return apiFetch(`/teams/${teamId}/close`, { method: "POST" });
}

export async function reopenTeam(teamId) {
  return apiFetch(`/teams/${teamId}/reopen`, { method: "POST" });
}

export async function updateProject(projectId, data) {
  return apiFetch(`/projects/${projectId}`, {
    method: "PUT",
    body: data,
  });
}

export async function submitProject(projectId) {
  return apiFetch(`/projects/${projectId}/submit`, { method: "POST" });
}

export async function removeMember(teamId, userId) {
  return apiFetch(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

export async function listAdditionalRepos(teamId) {
  return apiFetch(`/teams/${teamId}/repos`, { method: "GET" });
}

export async function createAdditionalRepo(teamId, label) {
  return apiFetch(`/teams/${teamId}/repos`, {
    method: "POST",
    body: { label },
  });
}

export async function deleteAdditionalRepo(teamId, repoId) {
  return apiFetch(`/teams/${teamId}/repos/${repoId}`, { method: "DELETE" });
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

export async function searchProjectsSemantic(query, eventId = null, limit = 20) {
  let url = `/projects/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  if (eventId) url += `&eventId=${eventId}`;
  return apiFetch(url, { method: "GET" });
}
export async function auditVotesByEvent(eventId) {
  const response = await apiFetch(`/qr-votes/event/${eventId}/audit`, { method: "GET" });
  return response;
}

// Password recovery
export async function forgotPassword(email) {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(token, newPassword) {
  return apiFetch("/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
  });
}

export async function changePassword(currentPassword, newPassword) {
  return apiFetch("/auth/password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}
