import { initSocket, disconnectSocket } from "../services/socket.js";

const PERSISTED_STORAGE_KEYS = ["teamup_lang"];
let accessToken = null;

function preserveLocalStorage(keys) {
  return keys.reduce((values, key) => {
    const value = localStorage.getItem(key);
    if (value !== null) values[key] = value;
    return values;
  }, {});
}

function restoreLocalStorage(values) {
  Object.entries(values).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

export const setToken = (token) => {
  accessToken = token || null;
  localStorage.removeItem("token");
};

export const getToken = () => {
  return accessToken;
};

export const setRefreshToken = (token) => {
  localStorage.removeItem("refreshToken");
};

export const getRefreshToken = () => {
  localStorage.removeItem("refreshToken");
  return null;
};

export const clearStoredSession = () => {
  const persistedValues = preserveLocalStorage(PERSISTED_STORAGE_KEYS);

  accessToken = null;
  disconnectSocket();
  sessionStorage.clear();
  localStorage.clear();
  restoreLocalStorage(persistedValues);
};

export const clearAuth = () => {
  clearStoredSession();
};

export const isAuthenticated = () => {
  return !!getToken() || !!getUser();
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function saveSession(token, _refreshToken, user) {
  clearStoredSession();
  accessToken = token || null;
  localStorage.setItem("user", JSON.stringify(user));
  initSocket();
}

export function clearSession(router) {
  clearStoredSession();
  if (router) {
    router.user = null;
    router.hasTeam = false;
    router.currentParams = {};
    router.currentRoute = null;
    router.historyStack = [];
    router.navigate("login");
  }
}

export function updateUser(data) {
  const current = getUser() || {};
  const next = { ...current, ...data };
  localStorage.setItem("user", JSON.stringify(next));
  return next;
}
