import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/eventCreated.css";
import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import { apiFetch, getGithubOrgs, getGithubAuthUrl } from "../services/api.js";

const AREAS = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"];
const AREA_LABELS = {
  DEVELOPMENT: "Development (TL Dev)",
  SOFT_SKILLS: "Soft Skills (TL Soft Skills)",
  ENGLISH: "English (TL English)",
};
const AREA_COLOR = {
  DEVELOPMENT: "#6b5cff",
  SOFT_SKILLS: "#5acca4",
  ENGLISH: "#eaa2fc",
};

const ALL_CLANS = [
  "Magdalena",
  "Esthercita",
  "Garabato",
  "Micaela",
  "Cayena",
  "Malecón",
  "Cortissoz",
  "Turing",
  "Tesla",
  "McCarthy",
];

export default class CreateEvent {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.loading = false;
    this.targetClans = []; // [] = all clans (will send null to API)
    this.githubOrgs = [];
    this.githubConnected = false;
    this.githubUsername = null;

    // State: which areas are enabled and their rubrics
    // rubrics[area] = [{ id, name, description, weight, grades: [score,...] }]
    this.enabledAreas = { DEVELOPMENT: true, SOFT_SKILLS: true, ENGLISH: true };
    this.rubrics = { DEVELOPMENT: [], SOFT_SKILLS: [], ENGLISH: [] };
    this._rubricCounter = 0;
  }

  // ── Data collection ─────────────────────────────────────────────────────────

  _getEventData() {
    return {
      title: document.getElementById("ev-title")?.value?.trim() ?? "",
      description:
        document.getElementById("ev-description")?.value?.trim() ?? "",
      eventType: document.getElementById("ev-type")?.value ?? "CAPSTONE",
      route: document.getElementById("ev-route")?.value ?? "BASIC",
      cohort: document.getElementById("ev-cohort")?.value?.trim() ?? "",
      githubOrg:
        document.getElementById("ev-github-org")?.value?.trim() ||
        this.selectedGithubOrg ||
        null,
      maxTeamSize: parseInt(
        document.getElementById("ev-max-team")?.value ?? "5",
      ),
      eventDate: document.getElementById("ev-start-date")?.value
        ? `${document.getElementById("ev-start-date").value}T10:00:00`
        : null,
      endDate: document.getElementById("ev-end-date")?.value
        ? `${document.getElementById("ev-end-date").value}T18:00:00`
        : null,
      status: "UPCOMING",
      // null = all clans; array = specific clans
      targetClans: this.targetClans.length > 0 ? this.targetClans : null,
    };
  }

  _toggleClan(clan) {
    if (this.targetClans.includes(clan)) {
      this.targetClans = this.targetClans.filter((c) => c !== clan);
    } else {
      this.targetClans.push(clan);
    }
    this._rerenderClanPicker();
  }

  _selectAllClans() {
    this.targetClans = [];
    this._rerenderClanPicker();
  }

  _rerenderClanPicker() {
    const container = document.getElementById("clan-picker-body");
    if (container) container.innerHTML = this._renderClanPickerBody();
    this._attachClanHandlers();
    this._updateClanSummary();
  }

  _updateClanSummary() {
    const summary = document.getElementById("clan-summary");
    if (!summary) return;
    if (this.targetClans.length === 0) {
      summary.textContent = "Todos los clanes";
      summary.className = "ce-clan-summary ce-clan-summary--all";
    } else {
      summary.textContent = this.targetClans.join(", ");
      summary.className = "ce-clan-summary ce-clan-summary--partial";
    }
  }

  _renderClanPickerBody() {
    const allSelected = this.targetClans.length === 0;
    return `
      <button class="ce-clan-chip ${allSelected ? "ce-clan-chip--active" : ""}" data-clan="ALL" type="button">
        Todos los clanes
      </button>
      ${ALL_CLANS.map((clan) => {
        const active = this.targetClans.includes(clan);
        return `<button class="ce-clan-chip ${active ? "ce-clan-chip--active" : ""}" data-clan="${clan}" type="button">${clan}</button>`;
      }).join("")}
    `;
  }

  _renderClanSection() {
    return `
      <div class="ce-clan-section">
        <label class="form-label fw-semibold">Clanes participantes</label>
        <p class="ce-section-subtitle" style="margin-bottom: 10px;">
          Selecciona los clanes que verán este evento, o déjalo en "Todos los clanes".
        </p>
        <div class="ce-clan-picker" id="clan-picker-body">
          ${this._renderClanPickerBody()}
        </div>
        <div class="ce-clan-footer">
          <span>Scope: </span>
          <span id="clan-summary" class="ce-clan-summary ce-clan-summary--all">Todos los clanes</span>
        </div>
      </div>
    `;
  }

  _attachClanHandlers() {
    document.querySelectorAll(".ce-clan-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.clan === "ALL") {
          this._selectAllClans();
        } else {
          this._toggleClan(btn.dataset.clan);
        }
      });
    });
  }

  _buildRubricsPayload() {
    const payload = [];
    for (const area of AREAS) {
      if (!this.enabledAreas[area]) continue;
      for (const r of this.rubrics[area]) {
        const nameEl = document.getElementById(`rubric-name-${r.id}`);
        const descEl = document.getElementById(`rubric-desc-${r.id}`);
        const weightEl = document.getElementById(`rubric-weight-${r.id}`);
        const gradeEls = document.querySelectorAll(
          `.grade-score[data-rubric="${r.id}"]`,
        );

        const grades = Array.from(gradeEls)
          .map((el) => ({ score: parseFloat(el.value) }))
          .filter((g) => !isNaN(g.score));

        payload.push({
          area,
          name: nameEl?.value?.trim() ?? "",
          description: descEl?.value?.trim() || null,
          weight: parseFloat(weightEl?.value ?? "0"),
          grades,
        });
      }
    }
    return payload;
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  _validate() {
    const ev = this._getEventData();
    if (!ev.title) return "El título del evento es obligatorio.";
    if (!ev.eventDate) return "La fecha de inicio es obligatoria.";

    for (const area of AREAS) {
      if (!this.enabledAreas[area]) continue;

      const rubrics = this.rubrics[area];
      if (rubrics.length === 0) {
        return `El área ${AREA_LABELS[area]} está habilitada pero no tiene rúbricas. Agrega al menos una o deshabilita el área.`;
      }

      let totalWeight = 0;
      for (const r of rubrics) {
        const name = document
          .getElementById(`rubric-name-${r.id}`)
          ?.value?.trim();
        const weight = parseFloat(
          document.getElementById(`rubric-weight-${r.id}`)?.value ?? "0",
        );
        const grades = document.querySelectorAll(
          `.grade-score[data-rubric="${r.id}"]`,
        );

        if (!name)
          return `Una rúbrica de ${AREA_LABELS[area]} no tiene nombre.`;
        if (isNaN(weight) || weight <= 0 || weight > 1)
          return `El peso de "${name}" debe ser un número entre 0.01 y 1.`;
        if (grades.length === 0)
          return `La rúbrica "${name}" no tiene opciones de calificación.`;

        for (const g of grades) {
          if (isNaN(parseFloat(g.value)))
            return `Todas las opciones de calificación de "${name}" deben ser números.`;
        }
        totalWeight += weight;
      }

      if (Math.abs(totalWeight - 1) > 0.01) {
        return `Los pesos de ${AREA_LABELS[area]} deben sumar 1.0 (actualmente suman ${totalWeight.toFixed(2)}).`;
      }
    }
    return null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async _handleSubmit() {
    this._clearFeedback();
    const err = this._validate();
    if (err) {
      this._showError(err);
      return;
    }

    this._setLoading(true);
    try {
      const body = {
        ...this._getEventData(),
        rubrics: this._buildRubricsPayload(),
      };
      await apiFetch("/events", { method: "POST", body });
      this._showSuccess("¡Evento creado exitosamente!");
      setTimeout(() => this.router.navigate("events"), 1600);
    } catch (e) {
      this._showError(e.message ?? "Error al crear el evento.");
    } finally {
      this._setLoading(false);
    }
  }

  // ── Rubric state helpers ───────────────────────────────────────────────────

  _addRubric(area) {
    const id = `r${++this._rubricCounter}`;
    this.rubrics[area].push({ id, grades: [5, 3, 1] });
    this._rerenderArea(area);
  }

  _removeRubric(area, rubricId) {
    this.rubrics[area] = this.rubrics[area].filter((r) => r.id !== rubricId);
    this._rerenderArea(area);
  }

  _addGrade(rubricId) {
    const area = this._findAreaForRubric(rubricId);
    const rubric = this.rubrics[area]?.find((r) => r.id === rubricId);
    if (rubric) {
      rubric.grades.push(0);
      this._rerenderArea(area);
    }
  }

  _removeGrade(rubricId, index) {
    const area = this._findAreaForRubric(rubricId);
    const rubric = this.rubrics[area]?.find((r) => r.id === rubricId);
    if (rubric && rubric.grades.length > 1) {
      rubric.grades.splice(index, 1);
      this._rerenderArea(area);
    }
  }

  _findAreaForRubric(rubricId) {
    return AREAS.find((a) => this.rubrics[a]?.some((r) => r.id === rubricId));
  }

  _toggleArea(area) {
    this.enabledAreas[area] = !this.enabledAreas[area];
    this._rerenderArea(area);
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  _rerenderArea(area) {
    const container = document.getElementById(`area-body-${area}`);
    const toggle = document.getElementById(`area-toggle-${area}`);
    if (!container || !toggle) return;

    const enabled = this.enabledAreas[area];
    toggle.textContent = enabled ? "Deshabilitar" : "Habilitar";
    toggle.className = `ce-area-toggle ${enabled ? "ce-area-toggle--on" : "ce-area-toggle--off"}`;
    container.innerHTML = enabled
      ? this._renderAreaBody(area)
      : this._renderAreaDisabled();
    if (enabled) this._attachAreaHandlers(area);
  }

  _renderAreaDisabled() {
    return `
      <p class="ce-area-disabled">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;opacity:.5;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        Esta área no será evaluada en este evento.
      </p>`;
  }

  _renderAreaBody(area) {
    const rubrics = this.rubrics[area];
    const totalW = rubrics.reduce((s, r) => {
      const el = document.getElementById(`rubric-weight-${r.id}`);
      return s + parseFloat(el?.value ?? r.weight ?? 0);
    }, 0);

    return `
      <div class="ce-rubrics-list" id="rubrics-list-${area}">
        ${rubrics.map((r) => this._renderRubricCard(r, area)).join("")}
      </div>
      ${
        rubrics.length === 0
          ? `<p class="ce-no-rubrics">Sin rúbricas. Agrega al menos una.</p>`
          : ""
      }
      <div class="ce-area-footer">
        <button class="ce-add-rubric-btn" data-area="${area}" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Agregar rúbrica
        </button>
        ${
          rubrics.length > 0
            ? `<span class="ce-weight-badge ${Math.abs(totalW - 1) < 0.01 ? "ce-weight-ok" : "ce-weight-warn"}">
              Peso total: ${totalW.toFixed(2)} / 1.0
            </span>`
            : ""
        }
      </div>`;
  }

  _renderRubricCard(r, area) {
    const grades = r.grades ?? [5, 3, 1];
    return `
      <div class="ce-rubric-card" id="rubric-card-${r.id}">
        <div class="ce-rubric-card-header">
          <span class="ce-rubric-num">Rúbrica</span>
          <button class="ce-rubric-remove" data-rubric-id="${r.id}" data-area="${area}" type="button" title="Eliminar rúbrica">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
        <div class="ce-rubric-row">
          <div class="ce-rubric-field ce-rubric-field--name">
            <label class="ce-field-label">Nombre *</label>
            <input id="rubric-name-${r.id}" type="text" class="ce-input" placeholder="Ej: Código limpio" value="${r.name ?? ""}" />
          </div>
          <div class="ce-rubric-field ce-rubric-field--weight">
            <label class="ce-field-label">Peso (0–1) *</label>
            <input id="rubric-weight-${r.id}" type="number" class="ce-input" step="0.01" min="0.01" max="1" placeholder="0.40" value="${r.weight ?? ""}" />
          </div>
        </div>
        <div class="ce-rubric-field" style="margin-top:8px;">
          <label class="ce-field-label">Descripción (opcional)</label>
          <input id="rubric-desc-${r.id}" type="text" class="ce-input" placeholder="Descripción corta" value="${r.description ?? ""}" />
        </div>
        <div class="ce-grades-section">
          <label class="ce-field-label" style="margin-bottom:6px;">Opciones de calificación *</label>
          <div class="ce-grades-list" id="grades-list-${r.id}">
            ${grades.map((score, i) => this._renderGradeInput(r.id, score, i)).join("")}
          </div>
          <button class="ce-add-grade-btn" data-rubric-id="${r.id}" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar puntaje
          </button>
        </div>
      </div>`;
  }

  _renderGradeInput(rubricId, score, index) {
    return `
      <div class="ce-grade-row" id="grade-row-${rubricId}-${index}">
        <span class="ce-grade-pill">${index + 1}</span>
        <input
          type="number"
          class="ce-input ce-grade-score grade-score"
          data-rubric="${rubricId}"
          data-index="${index}"
          value="${score}"
          min="0"
          placeholder="Puntaje" />
        <button class="ce-grade-remove" data-rubric-id="${rubricId}" data-index="${index}" type="button" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
  }

  // ── Full page render ───────────────────────────────────────────────────────

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0">
        ${this.header.render()}
        <main class="dashboard-main">
          <div class="ce-page">

            <!-- Event details card -->
            <section class="app-section p-4 p-md-5 mb-4">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="app-section-header mb-0">Detalles del Evento</h5>
                <span class="badge-draft">Draft Mode</span>
              </div>

              <div class="row g-4">
                <div class="col-12">
                  <label class="form-label fw-semibold">Título *</label>
                  <input id="ev-title" type="text" class="form-control app-input" placeholder="Ej: Integrador 2025-1" />
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold">Descripción</label>
                  <textarea id="ev-description" rows="3" class="form-control app-input" placeholder="Describe el evento…"></textarea>
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold">Tipo</label>
                  <select id="ev-type" class="form-select app-input">
                    <option value="CAPSTONE">Capstone / Integrador</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="EVENT">Evento Social</option>
                  </select>
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold">Ruta</label>
                  <select id="ev-route" class="form-select app-input">
                    <option value="BASIC">Basic</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold">Cohorte</label>
                  <input id="ev-cohort" type="text" class="form-control app-input" placeholder="Ej: 2025-1" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold">Fecha inicio *</label>
                  <input id="ev-start-date" type="date" class="form-control app-input" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold">Fecha entrega final</label>
                  <input id="ev-end-date" type="date" class="form-control app-input" />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label fw-semibold">Tamaño máximo de equipo</label>
                  <input id="ev-max-team" type="number" class="form-control app-input" value="5" min="1" max="20" />
                </div>
                <div class="col-12" id="github-org-section">
                  <label class="form-label fw-semibold">Organización de GitHub <span class="text-danger">*</span></label>
                  <div id="github-org-picker">
                    <!-- Rendered dynamically after render() via _loadGithubOrgs() -->
                    <div class="d-flex align-items-center gap-2 text-muted" style="font-size:0.9rem;">
                      <span class="spinner-border spinner-border-sm"></span> Verificando GitHub...
                    </div>
                  </div>
                </div>
                <div class="col-12">
                  ${this._renderClanSection()}
                </div>
              </div>
            </section>

            <!-- Rubrics section -->
            <section class="app-section p-4 p-md-5 mb-4">
              <div class="mb-4">
                <h5 class="app-section-header mb-1">Rúbricas de Evaluación</h5>
                <p class="ce-section-subtitle">
                  Define qué áreas se evaluarán y sus criterios. Los pesos de cada área deben sumar 1.0.
                </p>
              </div>

              ${AREAS.map((area) => this._renderAreaSection(area)).join("")}
            </section>

            <!-- Feedback + Submit -->
            <div id="ce-feedback"></div>
            <div class="ce-submit-row">
              <button id="ce-back-btn" class="app-btn-outline" type="button">Cancelar</button>
              <button id="ce-submit-btn" class="app-btn-primary ce-submit-btn" type="button">
                Crear Evento
              </button>
            </div>

          </div>
        </main>
      </div>
    `;

    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();
    this.navbar.attachEventHandlers();
    this._attachPageHandlers();
    this._attachClanHandlers();
    AREAS.forEach((area) => this._attachAreaHandlers(area));
    this._loadGithubOrgs();
  }

  _renderAreaSection(area) {
    const color = AREA_COLOR[area];
    return `
      <div class="ce-area-section" style="--area-color:${color};" id="area-section-${area}">
        <div class="ce-area-header">
          <div class="ce-area-title-row">
            <span class="ce-area-dot"></span>
            <h6 class="ce-area-title">${AREA_LABELS[area]}</h6>
          </div>
          <button
            id="area-toggle-${area}"
            class="ce-area-toggle ce-area-toggle--on"
            data-area="${area}"
            type="button">
            Deshabilitar
          </button>
        </div>
        <div id="area-body-${area}">
          ${this._renderAreaBody(area)}
        </div>
      </div>`;
  }

  // ── GitHub org loader ─────────────────────────────────────────────────────

  async _loadGithubOrgs() {
    const picker = document.getElementById("github-org-picker");
    const submitBtn = document.getElementById("ce-submit-btn");
    if (!picker) return;

    try {
      const data = await getGithubOrgs();
      this.githubConnected = true;
      this.githubUsername = data.username;
      this.githubOrgs = data.orgs ?? [];

      if (this.githubOrgs.length === 0) {
        picker.innerHTML = `
          <div class="alert alert-warning py-2 mb-0" style="font-size:0.88rem;">
            <strong>@${data.username}</strong> no pertenece a ninguna organización de GitHub.
            Los repositorios se crearán en tu cuenta personal.
          </div>
          <input type="hidden" id="ev-github-org" value="" />`;
        return;
      }

      // Auto-select first org
      this.selectedGithubOrg = this.githubOrgs[0].login;
      picker.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2" style="font-size:0.85rem;color:var(--color-text-muted);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Conectado como <strong>@${data.username}</strong>
        </div>
        <select id="ev-github-org" class="form-select app-input">
          ${this.githubOrgs.map((org) => `<option value="${org.login}">${org.login}</option>`).join("")}
        </select>
        <div class="mt-1" style="font-size:0.8rem;color:var(--color-text-muted);">
          Los repositorios de los equipos se crearán en esta organización.
        </div>`;

      document
        .getElementById("ev-github-org")
        ?.addEventListener("change", (e) => {
          this.selectedGithubOrg = e.target.value;
        });
    } catch (err) {
      this.githubConnected = false;
      this.githubOrgs = [];
      let authUrl = "#";
      try {
        const urlData = await getGithubAuthUrl();
        authUrl = urlData?.url ?? urlData ?? "#";
      } catch (_) {}

      picker.innerHTML = `
        <div class="alert alert-danger py-2 mb-0" style="font-size:0.88rem;">
          <strong>Debes conectar tu cuenta de GitHub para crear un evento.</strong><br>
          <a href="${authUrl}" class="alert-link">Conectar GitHub →</a>
        </div>`;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.title = "Conecta GitHub primero";
      }
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  _attachPageHandlers() {
    document
      .getElementById("ce-submit-btn")
      ?.addEventListener("click", () => this._handleSubmit());
    document
      .getElementById("ce-back-btn")
      ?.addEventListener("click", () => this.router.navigate("events"));
  }

  _attachAreaHandlers(area) {
    // Toggle area
    document
      .getElementById(`area-toggle-${area}`)
      ?.addEventListener("click", () => this._toggleArea(area));

    // Add rubric
    document
      .querySelector(`[data-area="${area}"].ce-add-rubric-btn`)
      ?.addEventListener("click", () => this._addRubric(area));

    // Remove rubric buttons
    document
      .querySelectorAll(`.ce-rubric-remove[data-area="${area}"]`)
      .forEach((btn) => {
        btn.addEventListener("click", () =>
          this._removeRubric(area, btn.dataset.rubricId),
        );
      });

    // Add grade buttons
    document.querySelectorAll(".ce-add-grade-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._addGrade(btn.dataset.rubricId));
    });

    // Remove grade buttons
    document.querySelectorAll(".ce-grade-remove").forEach((btn) => {
      btn.addEventListener("click", () =>
        this._removeGrade(btn.dataset.rubricId, parseInt(btn.dataset.index)),
      );
    });
  }

  // ── UI feedback ────────────────────────────────────────────────────────────

  _showError(msg) {
    const el = document.getElementById("ce-feedback");
    if (el) el.innerHTML = `<div class="ce-alert ce-alert--error">${msg}</div>`;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  _showSuccess(msg) {
    const el = document.getElementById("ce-feedback");
    if (el)
      el.innerHTML = `<div class="ce-alert ce-alert--success">${msg}</div>`;
  }

  _clearFeedback() {
    const el = document.getElementById("ce-feedback");
    if (el) el.innerHTML = "";
  }

  _setLoading(on) {
    const btn = document.getElementById("ce-submit-btn");
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on
      ? `<span class="ce-spinner"></span> Creando…`
      : "Crear Evento";
  }
}
