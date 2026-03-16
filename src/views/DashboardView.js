import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { apiFetch } from "../services/api.js";
import { finishEvent, reopenEvent } from "../services/api-events.js";
import { icons } from "../utils/icons.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";

export default class DashboardView {
  constructor(router, params) {
    this.router = router;
    this.user = getUser();
    this.eventId = params?.id || localStorage.getItem("currentEventId");
    this.eventName =
        params?.name || localStorage.getItem("currentEventName") || "Dashboard";
    this.navbar = new Navbar(router);
    this.header = new Header(router, { eventName: this.eventName });

    this.metrics = null;
    this.ranking = [];
    this.status = null;
    this.eventStatus = null;
    this.loading = true;
    this.error = null;
  }

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0 mx-0 mw-100">
        ${this.header.render()}
        <main class="dashboard-main">
          <div id="db-root"></div>
        </main>
      </div>
    `;
    this.navbar.attachEventHandlers();
    if (this.header.mountBreadcrumb) this.header.mountBreadcrumb();
    if (this.header.attachEventHandlers) this.header.attachEventHandlers();

    this._offLangChange = onLangChange(() => this._paint());

    await this._loadDashboardData();
  }

  async _loadDashboardData() {
    this.loading = true;
    this._paint();

    if (!this.eventId) {
      this.router.navigate("events");
      return;
    }

    try {
      // Parallel fetch for dashboard data
      const [metricsRes, rankingRes, statusRes, eventRes] = await Promise.allSettled([
        apiFetch(`/events/${this.eventId}/metrics`, { method: "GET" }),
        apiFetch(`/events/${this.eventId}/ranking`, { method: "GET" }),
        apiFetch(`/events/${this.eventId}/ranking/status`, { method: "GET" }),
        apiFetch(`/events/${this.eventId}`, { method: "GET" }),
      ]);

      if (metricsRes.status === "fulfilled") {
        this.metrics = metricsRes.value?.data ?? null;
      }
      if (rankingRes.status === "fulfilled") {
        this.ranking = rankingRes.value?.data?.ranking?.slice(0, 3) ?? [];
      }
      if (statusRes.status === "fulfilled") {
        this.status = statusRes.value?.data ?? null;
      }
      if (eventRes.status === "fulfilled") {
        this.eventStatus = eventRes.value?.status ?? eventRes.value?.data?.status ?? null;
        localStorage.setItem("currentEventStatus", this.eventStatus ?? "");
      }
    } catch (e) {
      console.error("Dashboard data load error:", e);
      if (!this.metrics) {
        this.error = e.message ?? t("common.error");
        toast.error(t("common.error"), this.error);
      }
    }
    this.loading = false;
    this._paint();
    this._attachLocalHandlers();
  }

  _paint() {
    const root = document.getElementById("db-root");
    if (!root) return;
    root.innerHTML = this._html();
  }

  _html() {
    if (this.loading) {
      return `
        <div class="d-flex flex-column align-items-center justify-content-center" style="height: 60vh; gap: 16px;">
          <div class="ce-spinner" style="width: 40px; height: 40px; border-width: 4px; border-top-color: var(--accent);"></div>
          <p class="text-muted fw-medium">${t("dashboard.preparingInsights")}</p>
        </div>
      `;
    }

    if (this.error && !this.metrics) {
      return `<div class="rk-alert rk-alert--error" style="margin:24px">${this.error}</div>`;
    }

    const totalTeams = this.metrics?.totalTeams ?? 0;
    const evaluatedTeams = this.metrics?.evaluatedProjects ?? 0;
    const evalPercentage =
        totalTeams > 0 ? Math.round((evaluatedTeams / totalTeams) * 100) : 0;

    return `
      <div class="db-container">
        
        <div class="db-layout-main">
          
          <!-- Left Column (340px): Metrics & Secondary Ranking -->
          <div class="d-flex flex-column gap-4" style="height: 100%;">
            
            <!-- Metric Squares (2x2) -->
            <div class="db-sidebar-metrics-grid flex-shrink-0">
               ${this._renderMetricCard(t("dashboard.totalTeams"), totalTeams, t("dashboard.teams"), icons.users())}
               ${this._renderMetricCard(t("dashboard.submitted"), this.metrics?.totalProjects ?? 0, t("dashboard.projects"), icons.folder())}
               ${this._renderMetricCard(t("dashboard.coders"), this.metrics?.totalCoders ?? 0, t("dashboard.coders"), icons.code())}
               ${this._renderMetricCard(
        t("dashboard.evaluated"),
        `${evaluatedTeams}/${totalTeams}`,
        `${evalPercentage}%`,
        icons.check(),
        true,
        evalPercentage,
    )}
            </div>

            <!-- Team Ranking (Secondary - Top 3 Only) -->
            <div class="db-section flex-grow-1 d-flex flex-column">
              <div class="db-section-header">
                <h3 class="db-section-title" style="font-size: 1rem;">${t("dashboard.top3Teams")}</h3>
                <a href="#" class="db-view-all navigate-ranking" style="font-size: 0.75rem;">${t("dashboard.viewFull")}</a>
              </div>
              <div class="db-widget mt-2 d-flex flex-column justify-content-center flex-grow-1">
                 ${
        this.ranking.length > 0
            ? this.ranking
                .slice(0, 3)
                .map(
                    (team, idx) => `
                    <div class="d-flex align-items-center justify-content-between p-3 mb-3 rounded border bg-light-subtle shadow-sm">
                       <div class="d-flex align-items-center gap-3">
                          <span class="fw-bold fs-5" style="color: ${this._getRankColor(idx)}; min-width: 30px;">#${idx + 1}</span>
                          <div class="d-flex flex-column">
                            <span class="small fw-bold text-truncate" style="max-width: 140px; color: var(--navy);">${team.team_name}</span>
                            <span class="text-muted" style="font-size: 0.7rem;">${team.category ?? "General"}</span>
                          </div>
                       </div>
                       <span class="badge" style="background: white; color: var(--navy); border: 1px solid var(--border); padding: 8px 12px;">${team.team_score} pt</span>
                    </div>
                 `,
                )
                .join("")
            : `<div class="text-center py-5"><p class="small text-muted mb-0">${t("ranking.notAvailable")}</p></div>`
    }
              </div>
            </div>

          </div>

          <!-- Right Column (Flexible): Protagonist Insights -->
          <div class="d-flex flex-column gap-4" style="height: 100%;">
            
            <!-- Grading Progress - Primary Protagonist -->
            <div class="db-section">
              <div class="db-section-header">
                <h3 class="db-section-title">${t("dashboard.gradingProgress")}</h3>
              </div>
              <div class="db-widget">
                <div class="row row-cols-1 row-cols-md-2 g-4">
                  ${(
        this.status?.requiredAreas || [
          "Development",
          "English Proficiency",
          "Soft Skills",
          "Innovation",
        ]
    )
        .map(
            (area, idx) => `
                    <div class="col">
                       <div class="p-3 rounded-4 border bg-white shadow-sm">
                          ${this._renderProgressArea(
                area,
                this.metrics?.evaluatedProjectsByArea?.[area] ??
                Math.floor(
                    (this.metrics?.evaluatedProjects ?? 0) *
                    (1 - idx * 0.05),
                ),
                this.metrics?.totalProjects ?? 0,
                this._getAreaColor(idx),
            )}
                       </div>
                    </div>
                  `,
        )
        .join("")}
                </div>
              </div>
            </div>

            <!-- Event Status Overview -->
            <div class="db-section flex-grow-1 d-flex flex-column">
               <div class="db-section-header">
                  <h3 class="db-section-title">${t("dashboard.eventStatus")}</h3>
                  ${this.status?.deliveryDate ? `<span class="badge rounded-pill bg-light text-muted border px-3 py-2 fw-bold" style="font-size: 0.75rem;">DUE: ${new Date(this.status.deliveryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>` : ""}
               </div>
               <div class="d-flex flex-column gap-4 py-1 flex-grow-1 justify-content-center">
                  <div class="d-flex justify-content-between align-items-end">
                     <div>
                        <div class="h2 mb-0 fw-bold" style="color: var(--navy);">${evalPercentage}%</div>
                        <div class="small fw-bold text-muted uppercase mt-1">${t("dashboard.evaluationRate")}</div>
                     </div>
                     <div class="text-end">
                        <div class="h4 mb-0 fw-bold" style="color: var(--accent);">${evaluatedTeams} / ${totalTeams}</div>
                        <div class="small text-muted">${t("dashboard.teamsFullyEvaluated")}</div>
                     </div>
                  </div>
                  <div class="db-progress-bar-bg" style="width: 100%; height: 12px; border-radius: 20px;">
                     <div class="db-progress-bar-fill" style="width: ${evalPercentage}%; background: var(--accent); border-radius: 20px;"></div>
                  </div>
                  <div class="mt-2">
                     ${this._renderStatusButton(evalPercentage)}
                  </div>
               </div>
            </div>

          </div>

        </div>
      </div>
    `;
  }

  _renderMetricCard(
      label,
      value,
      subtext,
      icon,
      showProgress = false,
      percentage = 0,
  ) {
    return `
      <div class="db-metric-card">
        <div class="db-metric-icon-box">
          <span style="width: 20px; height: 20px">${icon}</span>
        </div>
        <span class="db-metric-label">${label}</span>
        <span class="db-metric-value">${value}</span>
        ${
        showProgress
            ? `
          <div class="db-progress-bar-bg" style="width: 100%; height: 4px; margin-top: 4px; background: #f0f0f0;">
            <div class="db-progress-bar-fill" style="width: ${percentage}%; background: var(--accent);"></div>
          </div>
        `
            : ""
    }
        <span class="db-metric-subtext">${subtext}</span>
      </div>
    `;
  }

  _renderProgressArea(label, current, total, color) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return `
      <div class="db-progress-item">
        <div class="db-progress-info">
          <span class="db-progress-label">${label}</span>
          <span class="db-progress-count">${current}<span>/${total} ${t("dashboard.teams")}</span></span>
        </div>
        <div class="db-progress-bar-bg" style="width: 100%; height: 6px; background: #f0f0f0;">
          <div class="db-progress-bar-fill" style="width: ${percentage}%; background: ${color}"></div>
        </div>
      </div>
    `;
  }

  _renderActivityItem(text, time, color) {
    return `
      <div class="db-activity-item">
        <div class="db-activity-dot" style="background: ${color}"></div>
        <div class="db-activity-content">
          <span class="db-activity-text">${text}</span>
          <span class="db-activity-time">${time}</span>
        </div>
      </div>
    `;
  }

  _renderDeadline(title, time, urgent) {
    return `
      <div class="db-deadline-item ${urgent ? "db-deadline-urgent" : ""}">
        ${urgent ? '<span class="db-urgent-badge">${t("common.urgent")}</span>' : ""}
        <span class="db-deadline-title">${title}</span>
        <span class="db-deadline-time">${time}</span>
      </div>
    `;
  }

  _getAreaColor(idx) {
    const colors = [
      "var(--accent)",
      "var(--mint)",
      "var(--lilac)",
      "var(--gold)",
      "var(--danger)",
      "var(--navy)",
    ];
    return colors[idx % colors.length];
  }

  _getRankColor(idx) {
    const colors = ["#5acca4", "#6b5cff", "#e6ca52"];
    return colors[idx] || "#cbd5e0";
  }

  _renderStatusButton(evalPercentage) {
    const isFinished = this.eventStatus === "FINISHED";

    if (isFinished) {
      return `
        <div class="d-flex flex-column gap-2">
          <div class="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border"
               style="background: #f0fdf4; border-color: #86efac !important;">
            <span class="material-icons-round" style="font-size:1.1rem; color:#16a34a;">check_circle</span>
            <span class="small fw-bold" style="color:#16a34a;">${t("dashboard.eventFinished") || "Evento finalizado"}</span>
          </div>
          <button id="btn-reopen-event" class="w-100 py-3 shadow-sm"
                  style="background: transparent; border: 2px solid var(--accent); color: var(--accent); border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            <span class="material-icons-round" style="font-size:1rem; vertical-align:middle; margin-right:6px;">lock_open</span>
            ${t("dashboard.reopenEvent") || "Reabrir Evento"}
          </button>
        </div>
      `;
    }

    const canPublish = evalPercentage >= 100;
    const disabledAttr = canPublish ? "" : "disabled";
    const disabledStyle = canPublish
        ? "cursor:pointer;"
        : "cursor:not-allowed; opacity:0.5;";
    const tooltip = canPublish
        ? ""
        : `title="${t("dashboard.publishDisabledHint") || "La evaluación debe estar al 100% para publicar"}"`;

    return `
      <button id="btn-publish-results" class="app-btn-primary w-100 py-3 shadow-sm"
              style="${disabledStyle}" ${disabledAttr} ${tooltip}>
        <span class="material-icons-round" style="font-size:1rem; vertical-align:middle; margin-right:6px;">publish</span>
        ${t("dashboard.publishResults")}
      </button>
      ${!canPublish ? `<p class="small text-muted text-center mt-1 mb-0" style="font-size:0.75rem;">
        ${t("dashboard.publishDisabledHint") || "Evaluación al 100% requerida para publicar"}
      </p>` : ""}
    `;
  }

  _reloadNavbar() {
    // Re-render navbar in place so the new links (with/without voting+finalists) appear immediately
    const existingAside = document.querySelector("aside.sidebar");
    const existingMobileNav = document.querySelector("nav.mobile-nav");
    if (existingAside) existingAside.remove();
    if (existingMobileNav) existingMobileNav.remove();

    const app = document.getElementById("app");
    app.insertAdjacentHTML("afterbegin", this.navbar.render());
    this.navbar.attachEventHandlers();
  }

  _attachLocalHandlers() {
    document
        .querySelector(".navigate-ranking")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          this.router.navigate("ranking");
        });

    document.getElementById("btn-publish-results")?.addEventListener("click", async () => {
      const confirmed = confirm(
          t("dashboard.publishConfirm") || "¿Cerrar el evento y publicar resultados finales? Esta acción cambiará el estado a FINISHED."
      );
      if (!confirmed) return;

      const btn = document.getElementById("btn-publish-results");
      btn.disabled = true;
      btn.textContent = t("common.loading") || "Procesando...";

      try {
        await finishEvent(this.eventId);
        this.eventStatus = "FINISHED";
        localStorage.setItem("currentEventStatus", "FINISHED");
        toast.success(t("dashboard.publishSuccess") || "Evento finalizado", t("dashboard.publishSuccessMsg") || "El evento ha sido cerrado exitosamente.");
        this._paint();
        this._attachLocalHandlers();
        this._reloadNavbar();
      } catch (err) {
        console.error("Error finishing event:", err);
        toast.error(t("common.error") || "Error", err.message ?? "No se pudo finalizar el evento.");
        btn.disabled = false;
        btn.textContent = t("dashboard.publishResults");
      }
    });

    document.getElementById("btn-reopen-event")?.addEventListener("click", async () => {
      const confirmed = confirm(
          t("dashboard.reopenConfirm") || "¿Reabrir el evento? El estado volverá a IN_PROGRESS."
      );
      if (!confirmed) return;

      const btn = document.getElementById("btn-reopen-event");
      btn.disabled = true;
      btn.textContent = t("common.loading") || "Procesando...";

      try {
        await reopenEvent(this.eventId);
        this.eventStatus = "IN_PROGRESS";
        localStorage.setItem("currentEventStatus", "IN_PROGRESS");
        toast.success(t("dashboard.reopenSuccess") || "Evento reabierto", t("dashboard.reopenSuccessMsg") || "El evento ha sido reabierto.");
        this._paint();
        this._attachLocalHandlers();
        this._reloadNavbar();
      } catch (err) {
        console.error("Error reopening event:", err);
        toast.error(t("common.error") || "Error", err.message ?? "No se pudo reabrir el evento.");
        btn.disabled = false;
        btn.textContent = t("dashboard.reopenEvent") || "Reabrir Evento";
      }
    });
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
