import test from "node:test";
import assert from "node:assert/strict";
import {
  abortStateRequest,
  createStateContainer,
  renderStateContainer,
  runStateRequest,
  setStateError,
  UI_STATES,
} from "../src/components/StateContainer.js";

test("Front-End UI States Unit Suite", async (t) => {
  await t.test("createStateContainer initializes with IDLE state and null data", async () => {
    const container = createStateContainer();
    assert.equal(container.state, UI_STATES.IDLE);
    assert.equal(container.data, null);
    assert.equal(container.error, null);
  });

  await t.test("renderStateContainer renders loading state spinner", async () => {
    const dummyDiv = { innerHTML: "" };
    const state = { state: UI_STATES.LOADING, data: null, error: null };

    renderStateContainer({
      container: dummyDiv,
      stateContainer: state,
      loadingMessage: "Cargando datos...",
    });

    assert.ok(dummyDiv.innerHTML.includes("spinner-border"));
    assert.ok(dummyDiv.innerHTML.includes("Cargando datos..."));
  });

  await t.test("renderStateContainer renders empty state message", async () => {
    const dummyDiv = { innerHTML: "" };
    const state = { state: UI_STATES.EMPTY, data: [], error: null };

    renderStateContainer({
      container: dummyDiv,
      stateContainer: state,
      emptyMessage: "No hay registros disponibles",
    });

    assert.ok(dummyDiv.innerHTML.includes("No hay registros disponibles"));
  });

  await t.test("renderStateContainer renders error state with correlationId", async () => {
    const dummyDiv = {
      innerHTML: "",
      querySelector: () => null,
    };
    const state = {
      state: UI_STATES.ERROR,
      data: null,
      error: new Error("Fallo de red"),
      correlationId: "corr-123-abc",
    };

    renderStateContainer({
      container: dummyDiv,
      stateContainer: state,
    });

    assert.ok(dummyDiv.innerHTML.includes("Fallo de red"));
    assert.ok(dummyDiv.innerHTML.includes("corr-123-abc"));
  });

  await t.test("renderStateContainer wires retry action when available", async () => {
    let retryHandler = null;
    let retried = false;
    const dummyDiv = {
      innerHTML: "",
      querySelector: () => ({
        addEventListener: (_event, handler) => {
          retryHandler = handler;
        },
      }),
    };

    renderStateContainer({
      container: dummyDiv,
      stateContainer: {
        state: UI_STATES.ERROR,
        data: null,
        error: new Error("Fallo recuperable"),
      },
      onRetry: () => {
        retried = true;
      },
    });

    assert.ok(dummyDiv.innerHTML.includes("Reintentar"));
    retryHandler();
    assert.equal(retried, true);
  });

  await t.test("setStateError preserves last valid data as stale when requested", async () => {
    const state = createStateContainer([{ id: 1 }]);
    setStateError(state, new Error("Fallo de sincronización"), { preserveData: true });

    assert.equal(state.state, UI_STATES.STALE);
    assert.equal(state.isStale, true);
    assert.deepEqual(state.data, [{ id: 1 }]);
  });

  await t.test("runStateRequest moves from loading to empty", async () => {
    const state = createStateContainer();
    const changes = [];

    await runStateRequest({
      stateContainer: state,
      onChange: () => changes.push(state.state),
      request: async () => [],
    });

    assert.equal(changes[0], UI_STATES.LOADING);
    assert.equal(state.state, UI_STATES.EMPTY);
    assert.deepEqual(state.data, []);
  });

  await t.test("runStateRequest records API errors without presenting empty data", async () => {
    const state = createStateContainer();
    const error = new Error("API caída");
    error.correlationId = "corr-error-1";

    await runStateRequest({
      stateContainer: state,
      request: async () => {
        throw error;
      },
    });

    assert.equal(state.state, UI_STATES.ERROR);
    assert.equal(state.data, null);
    assert.equal(state.correlationId, "corr-error-1");
  });

  await t.test("abortStateRequest cancels pending request without updating after unmount", async () => {
    const state = createStateContainer();
    const controllerRef = { current: null };
    let settled = false;

    const pending = runStateRequest({
      stateContainer: state,
      controllerRef,
      request: ({ signal }) => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          const error = new Error("Petición cancelada");
          error.isAborted = true;
          reject(error);
        });
        setTimeout(() => resolve([{ id: 99 }]), 25);
      }),
    }).finally(() => {
      settled = true;
    });

    abortStateRequest(controllerRef);
    await pending;

    assert.equal(settled, true);
    assert.equal(state.state, UI_STATES.LOADING);
    assert.equal(state.data, null);
  });
});
