import test from "node:test";
import assert from "node:assert/strict";

function installBrowserMocks() {
  globalThis.localStorage = {
    removeItem() {},
  };
  globalThis.document = {
    cookie: "",
  };
  globalThis.window = {
    location: { href: "" },
  };
}

test("apiFetch converts request timeout into timeout error", async () => {
  installBrowserMocks();

  globalThis.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
    if (options.signal?.aborted) {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
      return;
    }
    options.signal?.addEventListener("abort", () => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
    });
  });

  const { apiFetch } = await import("../src/services/api.js");

  await assert.rejects(
    () => apiFetch("/slow", { method: "GET", timeout: 5 }),
    (error) => {
      assert.equal(error.isTimeout, true);
      assert.equal(error.isAborted, false);
      assert.match(error.message, /Timeout/);
      return true;
    },
  );
});

test("apiFetch distinguishes caller cancellation from timeout", async () => {
  installBrowserMocks();

  globalThis.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
    if (options.signal?.aborted) {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
      return;
    }
    options.signal?.addEventListener("abort", () => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
    });
  });

  const { apiFetch } = await import("../src/services/api.js");
  const controller = new AbortController();
  const request = apiFetch("/cancelled", {
    method: "GET",
    timeout: 1000,
    signal: controller.signal,
  });

  controller.abort();

  await assert.rejects(
    () => request,
    (error) => {
      assert.equal(error.isTimeout, false);
      assert.equal(error.isAborted, true);
      assert.match(error.message, /cancelada/i);
      return true;
    },
  );
});
