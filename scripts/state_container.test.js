import test from "node:test";
import assert from "node:assert/strict";
import { createStateContainer, renderStateContainer, UI_STATES } from "../src/components/StateContainer.js";

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
});
