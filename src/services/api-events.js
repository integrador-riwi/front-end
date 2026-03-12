import { apiFetch } from "./api.js";

export async function getEvents() {
  return apiFetch("/events", { method: "GET" });
}

export async function getEventById(id) {
  return apiFetch(`/events/${id}`, { method: "GET" });
}

export async function getUpcomingEvents() {
  return apiFetch("/events/upcoming", { method: "GET" });
}

export async function getPastEvents() {
  return apiFetch("/events/past", { method: "GET" });
}

export async function createEvent(data) {
  return apiFetch("/events", { method: "POST", body: data });
}

export async function updateEvent(id, data) {
  return apiFetch(`/events/${id}`, { method: "PUT", body: data });
}

export async function deleteEvent(id) {
  return apiFetch(`/events/${id}`, { method: "DELETE" });
}

// ── Rubrics ──────────────────────────────────────────────────────────────────

export async function getEventRubrics(eventId) {
  return apiFetch(`/events/${eventId}/rubrics`, { method: "GET" });
}

export async function addEventRubrics(eventId, rubrics) {
  return apiFetch(`/events/${eventId}/rubrics`, {
    method: "POST",
    body: { rubrics },
  });
}

export async function updateEventRubric(eventId, rubricId, data) {
  return apiFetch(`/events/${eventId}/rubrics/${rubricId}`, {
    method: "PUT",
    body: data,
  });
}

export async function deleteEventRubric(eventId, rubricId) {
  return apiFetch(`/events/${eventId}/rubrics/${rubricId}`, {
    method: "DELETE",
  });
}

// events
// events/create

// events/:id
// events/:id/projects
// events/:id/ranking
// events/:id/voting
// events/:id/finalists
// Ranking
export async function getEventRankingStatus(eventId) {
  return apiFetch(`/events/${eventId}/ranking/status`, { method: "GET" });
}

export async function publishEventRanking(eventId) {
  return apiFetch(`/events/${eventId}/ranking/publish`, { method: "POST" });
}

export async function getEventRanking(eventId) {
  return apiFetch(`/events/${eventId}/ranking`, { method: "GET" });
}
