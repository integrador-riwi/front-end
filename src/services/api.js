const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://team-up-production-c533.up.railway.app/api";

const CSRF_COOKIE_NAME = "teamup_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let _csrfToken = null;
let _refreshPromise = null;

function clearLegacyTokenStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
}

clearLegacyTokenStorage();

function readCookie(name) {
  return document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function clearClientSession() {
  const { clearAuth } = await import("../utils/auth.js");
  clearAuth();
}

function isUnsafeRequest(method = "GET") {
  return UNSAFE_METHODS.has(method.toUpperCase());
}

async function ensureCsrfToken() {
  if (_csrfToken && readCookie(CSRF_COOKIE_NAME)) {
    return _csrfToken;
  }

  const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });

  if (!csrfResponse.ok) {
    throw new Error(`No se pudo preparar la sesión (${csrfResponse.status})`);
  }

  const contentType = csrfResponse.headers.get("content-type") || "";
  let csrfData = {};
  if (contentType.includes("application/json")) {
    csrfData = await csrfResponse.json();
  }

  _csrfToken =
    csrfResponse.headers.get(CSRF_HEADER_NAME) ||
    csrfData?.data?.csrfToken ||
    csrfData?.csrfToken;

  if (!_csrfToken) {
    throw new Error("No se recibió token CSRF");
  }

  return _csrfToken;
}

async function buildHeaders(options = {}) {
  const isFormData = options.body instanceof FormData;
  const method = options.method || "GET";

  const headers = {
    ...options.headers,
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (isUnsafeRequest(method) && !headers[CSRF_HEADER_NAME]) {
    headers[CSRF_HEADER_NAME] = await ensureCsrfToken();
  }

  return headers;
}

function captureCsrfToken(response) {
  const csrfToken = response.headers.get(CSRF_HEADER_NAME);
  if (csrfToken) {
    _csrfToken = csrfToken;
  }
}

async function refreshSession() {
  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    const csrfToken = await ensureCsrfToken();
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: csrfToken,
      },
    });

    captureCsrfToken(refreshRes);

    if (!refreshRes.ok) {
      throw new Error("Refresh failed");
    }

    const refreshData = await refreshRes.json();
    _csrfToken = refreshData?.data?.csrfToken || _csrfToken;

    return true;
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

export async function apiFetch(endpoint, options = {}) {
  const { suppressAuthRedirect = false, timeout = 15000, signal, ...fetchOptions } = options;
  const isFormData = options.body instanceof FormData;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;
  const headers = await buildHeaders(options);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: "include",
      headers,
      signal: controller.signal,
      body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
    });

    clearTimeout(timeoutId);
    captureCsrfToken(response);

    if (response.status === 204) return null;

    // 401 — renovar con refresh cookie HttpOnly. Una sola rotación queda en vuelo.
    if (response.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login") {
      try {
        await refreshSession();

        // Reintentar la request original con cookies de sesión actualizadas.
        return apiFetch(endpoint, options);

      } catch (refreshError) {
        await clearClientSession();
        if (!suppressAuthRedirect) {
          window.location.href = "/";
        }
        throw refreshError;
      }
    }

    let data = {};
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: `Respuesta no válida del servidor (${response.status})`, message: text };
    }

    if (!response.ok) {
      const error = new Error(data.message || data.error || `Error HTTP ${response.status}`);
      error.response = { data, status: response.status };
      error.correlationId = data.correlationId || response.headers.get("X-Correlation-Id") || null;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      const timeoutError = new Error(signal?.aborted ? "Petición cancelada" : "Tiempo de espera agotado (Timeout)");
      timeoutError.isTimeout = !signal?.aborted;
      timeoutError.isAborted = !!signal?.aborted;
      throw timeoutError;
    }
    throw err;
  }
}

// Auth

export async function loginUser(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
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

export async function getMe(options = {}) {
  return apiFetch("/auth/me", { method: "GET", ...options });
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
