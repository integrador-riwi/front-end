function getCurrentProtocol() {
  if (typeof window !== "undefined" && window.location?.protocol) {
    return window.location.protocol;
  }
  return "https:";
}

export function normalizeServiceUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "";

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(value)) {
    return value.replace(/\/+$/, "");
  }

  if (value.startsWith("//")) {
    return `${getCurrentProtocol()}${value}`.replace(/\/+$/, "");
  }

  if (value.startsWith("/")) {
    return value.replace(/\/+$/, "") || "/";
  }

  return `${getCurrentProtocol()}//${value}`.replace(/\/+$/, "");
}
