import { apiFetch } from './api.js';

export async function getEvents() {
  return apiFetch('/events', { method: 'GET' });
}

export async function getEventById(id) {
  return apiFetch(`/events/${id}`, { method: 'GET' });
}

export async function getUpcomingEvents() {
  return apiFetch('/events/upcoming', { method: 'GET' });
}

export async function getPastEvents() {
  return apiFetch('/events/past', { method: 'GET' });
}

export async function createEvent(data) {
  return apiFetch('/events', { method: 'POST', body: data });
}

export async function updateEvent(id, data) {
  return apiFetch(`/events/${id}`, { method: 'PUT', body: data });
}

export async function deleteEvent(id) {
  return apiFetch(`/events/${id}`, { method: 'DELETE' });
}

// events
// events/create

// events/:id
// events/:id/projects
// events/:id/ranking
// events/:id/voting
// events/:id/finalists