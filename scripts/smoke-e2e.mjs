const API_URL =
  process.env.E2E_API_URL || "https://team-up-production-c533.up.railway.app/api";
const WEB_URL = process.env.E2E_WEB_URL || null;
const EMAIL = process.env.E2E_EMAIL || null;
const PASSWORD = process.env.E2E_PASSWORD || null;

const cookieJar = new Map();

const mergeSetCookie = (headers) => {
  const setCookie =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
        ? [headers.get("set-cookie")]
        : [];

  for (const cookie of setCookie) {
    const [pair] = cookie.split(";");
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    cookieJar.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
  }
};

const getCookieHeader = () =>
  Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

const request = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const cookieHeader = getCookieHeader();
  if (cookieHeader) headers.cookie = cookieHeader;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  mergeSetCookie(response.headers);

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || response.statusText);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { response, data };
};

const requireCredentials = () => {
  if (!EMAIL || !PASSWORD) {
    console.log(
      "[smoke-e2e] skipped: set E2E_EMAIL and E2E_PASSWORD to exercise the live smoke flow.",
    );
    return false;
  }
  return true;
};

const checkWebDeepLinks = async () => {
  if (!WEB_URL) return;

  for (const hash of ["#/events", "#/projects", "#/vote/smoke"]) {
    const response = await fetch(`${WEB_URL}/${hash}`);
    if (!response.ok) {
      throw new Error(`Deep link ${hash} returned ${response.status}`);
    }
  }
};

const run = async () => {
  await checkWebDeepLinks();

  if (!requireCredentials()) return;

  const csrf = await request("/auth/csrf", { method: "GET" });
  const csrfToken =
    csrf.response.headers.get("x-csrf-token") || csrf.data?.data?.csrfToken;

  if (!csrfToken) {
    throw new Error("CSRF token was not issued");
  }

  await request("/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const me = await request("/auth/me", { method: "GET" });
  if (!me.data?.data?.id_user) {
    throw new Error("Authenticated user was not returned by /auth/me");
  }

  const events = await request("/events?page=1&limit=5", { method: "GET" });
  const eventList = events.data?.data?.events || [];
  const selectedEvent = eventList[0];

  if (selectedEvent?.id) {
    await request(`/events/${selectedEvent.id}`, { method: "GET" });
  }

  await request("/projects?page=1&limit=5", { method: "GET" });

  if (selectedEvent?.id) {
    try {
      await request(`/qr-votes/vote/${selectedEvent.id}/projects`, {
        method: "GET",
      });
    } catch (error) {
      if (error.status !== 403 && error.status !== 404) {
        throw error;
      }
      console.log(
        `[smoke-e2e] voting data skipped for event ${selectedEvent.id}: ${error.status}`,
      );
    }
  }

  console.log("[smoke-e2e] passed");
};

run().catch((error) => {
  console.error("[smoke-e2e] failed:", error.message);
  process.exit(1);
});
