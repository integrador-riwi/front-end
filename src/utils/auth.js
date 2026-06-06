import { initSocket, disconnectSocket } from "../services/socket.js";

const PERSISTED_STORAGE_KEYS = ["teamup_lang"];

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
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const setRefreshToken = (token) => {
  localStorage.setItem("refreshToken", token);
};

export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

export const clearStoredSession = () => {
  const persistedValues = preserveLocalStorage(PERSISTED_STORAGE_KEYS);

  disconnectSocket();
  sessionStorage.clear();
  localStorage.clear();
  restoreLocalStorage(persistedValues);
};

export const clearAuth = () => {
  clearStoredSession();
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function saveSession(token, refreshToken, user) {
  clearStoredSession();
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
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
