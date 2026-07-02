import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { apiFetch } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/gradesAudit.css";

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const scoreClass = (score) => {
  const numeric = Number(score);
  if (numeric === 0) return "ga-score--zero";
  if (numeric >= 80) return "ga-score--high";
  if (numeric >= 60) return "ga-score--mid";
  return "ga-score--low";
};

export default class GradesAuditView {
  constructor(router) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.eventId = localStorage.getItem("currentEventId");
    this.eventName = localStorage.getItem("currentEventName") ?? "Evento";
    this.loading = false;
    this.error = null;
    this.audit = null;
    this.filters = {
      team: "ALL",
      area: "ALL",
      evaluator: "ALL",
      query: "",
      onlyZero: false,
    };
  }

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0 mx-0 mw-100">
        ${this.header.render()}
        <main class="dashboard-main">
          <div class="ga-page" id="grades-audit-root"></div>
        </main>
      </div>
    `;
    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();
    this.navbar.attachEventHandlers();
    this._offLangChange = onLangChange(() => this.render());

    if (!this.eventId) {
      this.error = "No hay evento seleccionado.";
      this._paint();
      return;
    }

    await this._loadAudit();
  }

  destroy() {
    this._offLangChange?.();
  }

  async _loadAudit() {
    this.loading = true;
    this.error = null;
    this._paint();

    try {
      const response = await apiFetch(
        `/evaluations/event/${this.eventId}/grade-audit`,
        { method: "GET" },
      );
      this.audit = response?.data ?? null;
    } catch (error) {
      this.error = error.message ?? "No se pudo cargar la auditoria.";
      toast.error(t("common.errorTitle"), this.error);
    }

    this.loading = false;
    this._paint();
  }

  _paint() {
    const root = document.getElementById("grades-audit-root");
    if (!root) return;
    root.innerHTML = this._html();
    this._attachHandlers();
  }

  _rows() {
    const rows = this.audit?.rows ?? [];
    return rows.filter((row) => {
      if (this.filters.team !== "ALL" && String(row.id_team) !== this.filters.team) {
        return false;
      }
      if (this.filters.area !== "ALL" && row.area !== this.filters.area) {
        return false;
      }
      if (this.filters.evaluator !== "ALL" && String(row.evaluator_user_id) !== this.filters.evaluator) {
        return false;
      }
      if (this.filters.onlyZero && Number(row.grade_score) !== 0) {
        return false;
      }
      const query = this.filters.query.trim().toLowerCase();
      if (!query) return true;
      const haystack = [
        row.team_name,
        row.project_name,
        row.area,
        row.evaluator_name,
        row.evaluator_email,
        row.evaluated_name,
        row.evaluated_email,
        row.rubric_name,
        row.grade_name,
        row.feedback,
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  _options(rows, key, labelKey) {
    const map = new Map();
    rows.forEach((row) => {
      const value = row[key];
      if (value !== null && value !== undefined) {
        map.set(String(value), row[labelKey]);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
      .map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`)
      .join("");
  }

  _html() {
    if (this.loading) {
      return `
        <div class="ga-loading">
          <div class="ce-spinner"></div>
          <p>Cargando auditoria de notas...</p>
        </div>
      `;
    }

    const rows = this.audit?.rows ?? [];
    const filtered = this._rows();
    const summary = this.audit?.summary ?? {};
    const zeroCount = filtered.filter((row) => Number(row.grade_score) === 0).length;
    const avgScore = filtered.length
      ? (filtered.reduce((sum, row) => sum + Number(row.grade_score || 0), 0) / filtered.length).toFixed(2)
      : "0.00";

    return `
      <section class="ga-shell">
        <header class="ga-header">
          <div>
            <span class="ga-eyebrow">${esc(this.eventName)}</span>
            <h1>Auditoria de notas</h1>
            <p>Detalle de calificaciones por equipo, area, persona, evaluador, rubrica y fecha.</p>
          </div>
          <button class="ga-refresh-btn" id="ga-refresh-btn" type="button">
            <span>Actualizar</span>
          </button>
        </header>

        ${this.error ? `<div class="ga-alert">${esc(this.error)}</div>` : ""}

        <section class="ga-metrics" aria-label="Resumen de auditoria">
          ${this._metric("Evaluaciones", summary.evaluations ?? rows.length)}
          ${this._metric("Equipos", summary.teams ?? 0)}
          ${this._metric("Evaluadores", summary.evaluators ?? 0)}
          ${this._metric("Personas", summary.evaluatedMembers ?? 0)}
          ${this._metric("Notas 0", zeroCount)}
          ${this._metric("Promedio filtro", avgScore)}
        </section>

        <section class="ga-filters">
          <label>
            <span>Equipo</span>
            <select id="ga-team-filter">
              <option value="ALL">Todos</option>
              ${this._options(rows, "id_team", "team_name")}
            </select>
          </label>
          <label>
            <span>Area</span>
            <select id="ga-area-filter">
              <option value="ALL">Todas</option>
              ${(summary.areas ?? []).map((area) => `<option value="${esc(area)}">${esc(area)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Evaluador</span>
            <select id="ga-evaluator-filter">
              <option value="ALL">Todos</option>
              ${this._options(rows, "evaluator_user_id", "evaluator_name")}
            </select>
          </label>
          <label class="ga-search">
            <span>Buscar</span>
            <input id="ga-search-input" type="search" value="${esc(this.filters.query)}" placeholder="Equipo, persona, rubrica, correo..." />
          </label>
          <label class="ga-check">
            <input id="ga-zero-filter" type="checkbox" ${this.filters.onlyZero ? "checked" : ""} />
            <span>Solo notas en 0</span>
          </label>
        </section>

        <section class="ga-table-wrap">
          <div class="ga-table-toolbar">
            <strong>${filtered.length}</strong>
            <span>registros encontrados</span>
          </div>
          ${filtered.length ? this._table(filtered) : this._empty()}
        </section>
      </section>
    `;
  }

  _metric(label, value) {
    return `
      <div class="ga-metric">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
      </div>
    `;
  }

  _table(rows) {
    return `
      <div class="ga-table-scroll">
        <table class="ga-table">
          <thead>
            <tr>
              <th>Equipo / Proyecto</th>
              <th>Area</th>
              <th>Persona evaluada</th>
              <th>Evaluador</th>
              <th>Rubrica</th>
              <th>Nota</th>
              <th>Resultados calculados</th>
              <th>Fecha</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => this._row(row)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  _row(row) {
    return `
      <tr>
        <td>
          <strong>${esc(row.team_name)}</strong>
          <span>${esc(row.project_name)}</span>
        </td>
        <td><span class="ga-area">${esc(row.area)}</span></td>
        <td>
          <strong>${esc(row.evaluated_name)}</strong>
          <span>${esc(row.evaluated_email)}</span>
        </td>
        <td>
          <strong>${esc(row.evaluator_name)}</strong>
          <span>${esc(row.evaluator_role)} · ${esc(row.evaluator_email)}</span>
        </td>
        <td>
          <strong>${esc(row.rubric_name)}</strong>
          <span>Peso ${esc(row.rubric_weight ?? "-")} · ${esc(row.grade_name ?? "Nivel")}</span>
        </td>
        <td>
          <span class="ga-score ${scoreClass(row.grade_score)}">${esc(row.grade_score)}</span>
        </td>
        <td>
          <span>Area: ${esc(row.calculated_area_score ?? "-")}</span>
          <span>Persona: ${esc(row.calculated_project_score ?? "-")}</span>
        </td>
        <td>
          <span>${formatDate(row.evaluated_at)}</span>
          <span>Calc: ${formatDate(row.project_calculated_at)}</span>
        </td>
        <td class="ga-feedback">${esc(row.feedback || "-")}</td>
      </tr>
    `;
  }

  _empty() {
    return `
      <div class="ga-empty">
        <strong>No hay registros para los filtros seleccionados.</strong>
        <span>Ajusta los filtros o actualiza la auditoria.</span>
      </div>
    `;
  }

  _attachHandlers() {
    document.getElementById("ga-refresh-btn")?.addEventListener("click", () => {
      this._loadAudit();
    });

    const bindFilter = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = this.filters[key];
      el.addEventListener("change", () => {
        this.filters[key] = el.value;
        this._paint();
      });
    };

    bindFilter("ga-team-filter", "team");
    bindFilter("ga-area-filter", "area");
    bindFilter("ga-evaluator-filter", "evaluator");

    const queryInput = document.getElementById("ga-search-input");
    queryInput?.addEventListener("change", () => {
      this.filters.query = queryInput.value;
      this._paint();
    });
    queryInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        this.filters.query = queryInput.value;
        this._paint();
      }
    });

    const zeroFilter = document.getElementById("ga-zero-filter");
    zeroFilter?.addEventListener("change", () => {
      this.filters.onlyZero = zeroFilter.checked;
      this._paint();
    });
  }
}
