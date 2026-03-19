import { initSocket, disconnectSocket } from "../services/socket.js";

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

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
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
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
  initSocket();
}

export function clearSession(router) {
  disconnectSocket();
  clearAuth();
  if (router) {
    router.navigate("login");
  }
}

export function updateUser(data) {
  const current = getUser() || {};
  const next = { ...current, ...data };
  localStorage.setItem("user", JSON.stringify(next));
  return next;
}