import { clearSession } from "./auth.js";

//Login form helpers
export function renderErrorBox(message) {
  if (!message) return "";
  return `
    <div class="error-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
      </svg>
      ${message}
    </div>
  `;
}

export const getInitials = (name) => {
  return (name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Renders an avatar: <img> if avatarUrl exists, otherwise a div with initials.
 * @param {string} name - User's name (for initials fallback)
 * @param {string|null} avatarUrl - GitHub avatar URL
 * @param {string} className - CSS class(es) for the container
 * @param {string} colorClass - Extra class for colored fallback (e.g. "ct-avatar-color-0")
 */
export const renderAvatar = (name, avatarUrl, className, colorClass = "") => {
  if (avatarUrl) {
    return `<img src="${avatarUrl}" alt="${name ?? "User"}" class="${className} flex-shrink-0" style="border-radius:50%;object-fit:cover;">`;
  }
  return `<div class="${className} ${colorClass} flex-shrink-0">${getInitials(name)}</div>`;
};

export const getCurrentUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const logout = (router) => {
  clearSession(router);
};

export const getEventIdFromUrl = () => {
  const match = window.location.pathname.match(/events\/(\d+)/);
  return match ? match[1] : null;
};

export const getEventSectionFromUrl = () => {
  const match = window.location.pathname.match(/events\/\d+\/([^/]+)/);
  return match ? match[1] : null;
};

export function getSelectedEvent() {
  const event = localStorage.getItem("currentEventId");
  return event ? JSON.parse(event) : null;
}

