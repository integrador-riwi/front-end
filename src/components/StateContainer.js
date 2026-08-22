export const UI_STATES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  EMPTY: "empty",
  ERROR: "error",
  STALE: "stale",
};

export function isEmptyData(data) {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") {
    if (Array.isArray(data.items)) return data.items.length === 0;
    if (Array.isArray(data.rows)) return data.rows.length === 0;
  }
  return false;
}

export function isAbortError(error) {
  return error?.name === "AbortError" || error?.isAborted === true;
}

export function getCorrelationId(error) {
  return error?.correlationId || error?.response?.data?.correlationId || null;
}

/**
 * Creates a standardized state container for async data fetching.
 */
export function createStateContainer(initialData = null) {
  return {
    state: UI_STATES.IDLE,
    data: initialData,
    error: null,
    correlationId: null,
    lastUpdated: null,
    isStale: false,
  };
}

export function setStateLoading(stateContainer, { preserveData = false } = {}) {
  const hasData = !isEmptyData(stateContainer.data);
  stateContainer.state = preserveData && hasData ? UI_STATES.STALE : UI_STATES.LOADING;
  stateContainer.error = null;
  stateContainer.correlationId = null;
  stateContainer.isStale = preserveData && hasData;
  return stateContainer;
}

export function setStateSuccess(stateContainer, data, { isEmpty = isEmptyData } = {}) {
  stateContainer.data = data;
  stateContainer.error = null;
  stateContainer.correlationId = null;
  stateContainer.lastUpdated = new Date().toISOString();
  stateContainer.isStale = false;
  stateContainer.state = isEmpty(data) ? UI_STATES.EMPTY : UI_STATES.SUCCESS;
  return stateContainer;
}

export function setStateError(stateContainer, error, { preserveData = false } = {}) {
  const hasData = !isEmptyData(stateContainer.data);
  stateContainer.error = error;
  stateContainer.correlationId = getCorrelationId(error);
  if (preserveData && hasData) {
    stateContainer.state = UI_STATES.STALE;
    stateContainer.isStale = true;
  } else {
    stateContainer.data = null;
    stateContainer.state = UI_STATES.ERROR;
    stateContainer.isStale = false;
  }
  return stateContainer;
}

export async function runStateRequest({
  stateContainer,
  request,
  controllerRef = null,
  onChange = null,
  preserveData = false,
  isEmpty = isEmptyData,
}) {
  controllerRef?.current?.abort();
  const controller = new AbortController();
  if (controllerRef) controllerRef.current = controller;

  setStateLoading(stateContainer, { preserveData });
  onChange?.();

  try {
    const data = await request({ signal: controller.signal });
    if (controller.signal.aborted) return null;
    setStateSuccess(stateContainer, data, { isEmpty });
    return data;
  } catch (error) {
    if (isAbortError(error)) return null;
    setStateError(stateContainer, error, { preserveData });
    return null;
  } finally {
    if (controllerRef?.current === controller) controllerRef.current = null;
    if (!controller.signal.aborted) onChange?.();
  }
}

export function abortStateRequest(controllerRef) {
  controllerRef?.current?.abort();
  if (controllerRef) controllerRef.current = null;
}

/**
 * Renders UI HTML based on state: loading, empty, error (with retry & correlationId) or custom content.
 */
export function renderStateContainer({
  container,
  stateContainer,
  onRetry = null,
  emptyMessage = "No se encontraron datos disponibles.",
  loadingMessage = "Cargando información...",
  renderSuccess,
}) {
  if (!container) return;

  const { state, data, error, correlationId, isStale } = stateContainer;

  if (state === UI_STATES.LOADING) {
    container.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center p-4 my-3 text-center rounded-3" style="background: rgba(107,92,255,0.03); border: 1px dashed rgba(107,92,255,0.2);">
        <div class="spinner-border text-primary mb-2" role="status" style="width: 2.2rem; height: 2.2rem;"></div>
        <span class="fw-medium text-muted" style="font-size: 0.9rem;">${loadingMessage}</span>
      </div>
    `;
    return;
  }

  if (state === UI_STATES.ERROR) {
    const correlationHtml = correlationId
      ? `<div class="mt-2 text-muted font-monospace" style="font-size: 0.75rem;">ID de correlación: <code>${correlationId}</code></div>`
      : "";

    container.innerHTML = `
      <div class="alert alert-danger d-flex flex-column align-items-center text-center p-4 my-3 rounded-3 shadow-sm" role="alert">
        <span class="material-symbols-outlined mb-2" style="font-size: 2.5rem; color: #dc3545;">error</span>
        <h6 class="fw-bold mb-1">Ocurrió un problema al cargar los datos</h6>
        <p class="mb-2" style="font-size: 0.88rem;">${error?.message || "No se pudo completar la solicitud."}</p>
        ${correlationHtml}
        ${
          onRetry
            ? `<button id="state-retry-btn" class="btn btn-sm btn-outline-danger mt-3 px-3 fw-bold d-flex align-items-center gap-1">
                 <span class="material-symbols-outlined" style="font-size: 1rem;">refresh</span> Reintentar
               </button>`
            : ""
        }
      </div>
    `;

    if (onRetry) {
      container.querySelector("#state-retry-btn")?.addEventListener("click", () => {
        onRetry();
      });
    }
    return;
  }

  if (state === UI_STATES.EMPTY || (Array.isArray(data) && data.length === 0)) {
    container.innerHTML = `
      <div class="d-flex flex-column align-items-center justify-content-center p-4 my-3 text-center rounded-3" style="background: #f8f9fa; border: 1px dashed #dee2e6;">
        <span class="material-symbols-outlined text-secondary mb-2" style="font-size: 2.5rem;">inbox</span>
        <p class="text-muted mb-0 fw-medium" style="font-size: 0.9rem;">${emptyMessage}</p>
      </div>
    `;
    return;
  }

  if (state === UI_STATES.SUCCESS || state === UI_STATES.STALE || data) {
    const staleNotice = isStale
      ? `<div class="alert alert-warning py-1 px-3 mb-2 rounded-2 d-flex align-items-center gap-2" style="font-size: 0.78rem;">
           <span class="material-symbols-outlined" style="font-size: 1rem;">history</span>
           <span>Mostrando información desactualizada (falló la sincronización).</span>
         </div>`
      : "";

    container.innerHTML = staleNotice;
    const contentNode = renderSuccess(data);
    if (typeof contentNode === "string") {
      container.innerHTML += contentNode;
    } else if (contentNode instanceof HTMLElement) {
      container.appendChild(contentNode);
    }
  }
}
