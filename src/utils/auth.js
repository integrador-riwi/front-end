export const clearAuth = () => {
  localStorage.removeItem("user");
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession(router) {
  localStorage.removeItem("user");
  router.navigate("login");
}

export async function checkAuth() {
  try {
    const { getMe } = await import('../services/api.js');
    const response = await getMe();
    saveUser(response.data);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}
