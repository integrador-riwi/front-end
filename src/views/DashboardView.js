import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import * as XLSX from "xlsx";
import { getUser } from "../utils/auth.js";
import { apiFetch, getEventEvalCoverage, closeEventEvaluations, reopenEventEvaluations, getTeamEvalCounts } from "../services/api.js";
import { icons } from "../utils/icons.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import logoUrl from "../assets/logo.svg";
import {
  UI_STATES,
  abortStateRequest,
  createStateContainer,
  runStateRequest,
} from "../components/StateContainer.js";
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
    this.eventInfo = null;
    this.eventStatus = null;
    this.evalCoverage = null; // { evaluations_closed, canClose, missing[] }
    this.teamEvalCounts = []; // [{ id_team, team_name, areas: { DEVELOPMENT: N, ... } }]
    this.allTeams = [];       // full team objects with members
    this.teamSearch = "";
    this.loading = true;
    this.error = null;
    this.dataState = createStateContainer();
    this._dashboardRequest = { current: null };
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
    this._initAvatarTooltip();

    this._offLangChange = onLangChange(() => this._paint());

    await this._loadDashboardData();
  }

  async _loadDashboardData() {
    if (!this.eventId) {
      this.router.navigate("events");
      return;
    }

    await runStateRequest({
      stateContainer: this.dataState,
      controllerRef: this._dashboardRequest,
      preserveData: true,
      onChange: () => {
        this.loading = this.dataState.state === UI_STATES.LOADING;
        this.error = this.dataState.error?.message ?? null;
        this._paint();
        this._attachLocalHandlers();
      },
      request: async ({ signal }) => {
      // Parallel fetch for dashboard data
      const [metricsRes, rankingRes, statusRes, eventRes, coverageRes, teamCountsRes, teamsRes] = await Promise.allSettled([
        apiFetch(`/events/${this.eventId}/metrics`, { method: "GET", signal }),
        apiFetch(`/events/${this.eventId}/ranking`, { method: "GET", signal }),
        apiFetch(`/events/${this.eventId}/ranking/status`, { method: "GET", signal }),
        apiFetch(`/events/${this.eventId}`, { method: "GET", signal }),
        getEventEvalCoverage(this.eventId, { signal }),
        getTeamEvalCounts(this.eventId, { signal }),
        apiFetch(`/teams?idEvent=${this.eventId}&limit=100&includeSubmitted=true&includeClosed=true`, { method: "GET", signal }),
      ]);

      const critical = [metricsRes, statusRes, eventRes, coverageRes, teamCountsRes, teamsRes];
      const criticalError = critical.find((result) => result.status === "rejected");
      if (criticalError) throw criticalError.reason;

      if (metricsRes.status === "fulfilled") {
        this.metrics = metricsRes.value?.data ?? null;
      }
      if (rankingRes.status === "fulfilled") {
        this.ranking = rankingRes.value?.data?.ranking?.slice(0, 3) ?? [];
      } else if (rankingRes.reason?.response?.status === 404) {
        this.ranking = [];
      } else {
        throw rankingRes.reason;
      }
      if (statusRes.status === "fulfilled") {
        this.status = statusRes.value?.data ?? null;
      }
      if (eventRes.status === "fulfilled") {
        this.eventInfo = eventRes.value?.data ?? eventRes.value ?? null;
        this.eventStatus = this.eventInfo?.status ?? eventRes.value?.status ?? null;
        localStorage.setItem("currentEventStatus", this.eventStatus ?? "");
      }
      if (coverageRes.status === "fulfilled") {
        this.evalCoverage = coverageRes.value ?? null;
      }
      if (teamCountsRes.status === "fulfilled") {
        this.teamEvalCounts = Array.isArray(teamCountsRes.value) ? teamCountsRes.value : [];
      }
      if (teamsRes.status === "fulfilled") {
        this.allTeams = teamsRes.value?.data?.teams ?? teamsRes.value?.teams ?? [];
      }
      return {
        metrics: this.metrics,
        ranking: this.ranking,
        status: this.status,
        eventInfo: this.eventInfo,
        evalCoverage: this.evalCoverage,
        teamEvalCounts: this.teamEvalCounts,
        allTeams: this.allTeams,
      };
      },
    });

    this.loading = this.dataState.state === UI_STATES.LOADING;
    this.error = this.dataState.error?.message ?? null;
    if (this.dataState.state === UI_STATES.ERROR) {
      toast.error(t("common.errorTitle"), this.error ?? t("common.error"));
    }
  }

  _paint() {
    const root = document.getElementById("db-root");
    if (!root) return;
    root.innerHTML = this._html();
  }

  _html() {
    if (this.dataState.state === UI_STATES.LOADING) {
      return `
        <div class="d-flex flex-column align-items-center justify-content-center" style="height: 60vh; gap: 16px;">
          <div class="ce-spinner" style="width: 40px; height: 40px; border-width: 4px; border-top-color: var(--accent);"></div>
          <p class="text-muted fw-medium">Loading Metrics...</p>
        </div>
      `;
    }

    if (this.dataState.state === UI_STATES.ERROR) {
      const correlationHtml = this.dataState.correlationId
        ? `<div class="mt-2 text-muted font-monospace" style="font-size:.75rem;">ID de correlación: <code>${this.dataState.correlationId}</code></div>`
        : "";
      return `
        <div class="alert alert-danger d-flex flex-column align-items-center text-center p-4 m-4 rounded-3" role="alert">
          <span class="material-symbols-outlined mb-2" style="font-size:2.5rem;">error</span>
          <h2 class="h6 fw-bold mb-1">No se pudieron cargar las métricas</h2>
          <p class="mb-2" style="font-size:.9rem;">${this.dataState.error?.message ?? t("common.error")}</p>
          ${correlationHtml}
          <button id="db-retry-btn" class="btn btn-sm btn-outline-danger mt-2 fw-bold" type="button">
            <span class="material-symbols-outlined align-middle me-1" style="font-size:1rem;">refresh</span>${t("common.retry")}
          </button>
        </div>
      `;
    }

    const staleNotice = this.dataState.isStale
      ? `<div class="alert alert-warning py-2 px-3 mb-3 rounded-2 d-flex align-items-center gap-2" role="status">
           <span class="material-symbols-outlined" style="font-size:1rem;">history</span>
           <span>Mostrando métricas desactualizadas porque falló la última sincronización.</span>
         </div>`
      : "";
    const totalTeams = this.metrics?.totalTeams ?? 0;
    const evaluatedTeams = this.metrics?.evaluatedProjects ?? 0;
    const evalPercentage =
        totalTeams > 0 ? Math.round((evaluatedTeams / totalTeams) * 100) : 0;
    const canEdit = this.user?.role === "ADMIN" && this.eventId;

    return `
      <div class="db-container">
        ${staleNotice}
        <div class="d-flex justify-content-end gap-2 flex-wrap">
          <button id="db-teams-excel-btn" class="btn fw-semibold d-inline-flex align-items-center gap-2" style="background:var(--accent);border:1px solid var(--accent);color:white;">
            <span class="material-icons-round" style="font-size:1rem;">table_view</span>
            <span>${t("dashboard.teamsReport")}</span>
          </button>
          ${canEdit ? `
            <button id="db-edit-event-btn" class="btn btn-primary fw-semibold" style="background:#5548e2;border:none;">
              ${t("eventDetails.edit")}
            </button>
          ` : ""}
        </div>
        
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
                  ${(() => {
      const cv = this.evalCoverage;
      const totalTeams = this.metrics?.totalTeams ?? 0;

      // Build area → missing team names map from coverage data
      const missingByArea = {};
      if (cv?.missing?.length) {
        for (const entry of cv.missing) {
          for (const area of (entry.missingAreas ?? [])) {
            if (!missingByArea[area]) missingByArea[area] = [];
            missingByArea[area].push(entry.projectName);
          }
        }
      }

      // Use only areas configured for this event
      const requiredAreas = cv?.requiredAreas ?? [];
      const ALL_AREAS = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"];

      const displayAreas = ALL_AREAS.map((area, idx) => {
        const isActive = requiredAreas.includes(area);
        if (!isActive) {
          return this._renderProgressAreaInactive(area, idx);
        }
        const missing = missingByArea[area] ?? [];
        const evaluated = totalTeams - missing.length;
        return this._renderProgressArea(
            area,
            evaluated,
            totalTeams,
            this._getAreaColor(idx),
            missing,
        );
      });

      return displayAreas.map(html => `
                      <div class="col">
                        <div class="p-3 rounded-4 border bg-white shadow-sm">
                          ${html}
                        </div>
                      </div>
                    `).join("");
    })()}
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

      <!-- Teams Evaluation Status -->
      <div class="db-section mt-4">
        ${this._renderTeamsEvalTable()}
      </div>
    </div>
  `;
  }

  _renderTeamsEvalTable() {
    const ALL_AREAS = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"];
    const requiredAreas = this.evalCoverage?.requiredAreas ?? ALL_AREAS;

    const areaLabel = {
      DEVELOPMENT: t("tl.areaDev") || "Dev",
      SOFT_SKILLS: t("tl.areaSoft") || "Soft Skills",
      ENGLISH:     t("tl.areaEnglish") || "English",
    };

    const thCells = ALL_AREAS.map(area => {
      const isActive = requiredAreas.includes(area);
      return `<th style="padding:10px 8px;text-align:center;font-size:0.72rem;font-weight:700;color:${isActive ? "var(--text-muted)" : "#d1d5db"};text-transform:uppercase;letter-spacing:.05em;">
        ${areaLabel[area]}${!isActive ? ` <span style="font-size:0.65rem;opacity:.6;">(N/A)</span>` : ""}
      </th>`;
    }).join("");

    return `
      <div class="db-section-header mb-3">
        <h3 class="db-section-title">${t("dashboard.teamsEvalStatus") || "Estado de calificaciones por equipo"}</h3>
        <div style="position:relative;max-width:280px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--text-muted);pointer-events:none;">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input id="db-team-search"
                 type="text"
                 placeholder="${t("team.searchTeams") || "Buscar equipos, miembros, clan..."}"
                 value="${this.teamSearch}"
                 style="width:100%;padding:7px 12px 7px 32px;border-radius:999px;border:1px solid var(--border-card);font-size:0.8rem;background:white;color:var(--navy);outline:none;">
        </div>
      </div>
      <div class="db-widget" style="padding:0;overflow:hidden;">
        <div style="overflow-x:auto;overflow-y:auto;max-height:420px;min-height:420px;">
          <table style="width:100%;border-collapse:collapse;min-width:520px;">
            <colgroup>
              <col style="width:32%;">
              <col style="width:18%;">
              <col style="width:17%;">
              <col style="width:17%;">
              <col style="width:16%;">
            </colgroup>
            <thead style="position:sticky;top:0;background:white;z-index:1;">
              <tr style="border-bottom:2px solid var(--border);">
                <th style="padding:10px 16px;text-align:left;font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">${t("teamsProjects.team") || "Equipo"}</th>
                <th style="padding:10px 16px;text-align:left;font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">${t("teamsProjects.members") || "Miembros"}</th>
                ${thCells}
              </tr>
            </thead>
            <tbody id="db-teams-table-wrap">
              ${this._renderTeamsTable()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderTeamsTable() {
    const ALL_AREAS = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"];
    const requiredAreas = this.evalCoverage?.requiredAreas ?? ALL_AREAS;

    const countsMap = {};
    for (const row of this.teamEvalCounts) {
      countsMap[row.id_team] = row.areas ?? {};
    }

    const q = this.teamSearch.trim().toLowerCase();
    const teams = (this.allTeams ?? []).filter(team => {
      if (!q) return true;
      const matchTeam = (team.name ?? "").toLowerCase().includes(q);
      const matchDesc = (team.description ?? "").toLowerCase().includes(q);
      const matchMember = (team.members ?? []).some(m =>
          (m.name ?? "").toLowerCase().includes(q) ||
          (m.clan ?? "").toLowerCase().includes(q)
      );
      return matchTeam || matchDesc || matchMember;
    });

    if (teams.length === 0) {
      return `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);font-size:0.875rem;">${t("tl.noTeamsFound") || "No teams found"}</td></tr>`;
    }

    return teams.map(team => {
      const areas = countsMap[team.id_team] ?? {};
      const members = team.members ?? [];

      const avatarsHtml = members.slice(0, 5).map(m =>
          m.github_avatar_url
              ? `<img src="${this._esc(m.github_avatar_url)}" alt="${this._esc(m.name)}"
                  class="app-avatar-has-tip ct-member-clickable"
                  data-tip-name="${this._esc(m.name)}"
                  data-user-id="${this._esc(m.id_user)}"
                  style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:2px solid white;margin-left:-6px;flex-shrink:0;cursor:pointer;">`
              : `<div
                  class="app-avatar-has-tip ct-member-clickable"
                  data-tip-name="${this._esc(m.name)}"
                  data-user-id="${this._esc(m.id_user)}"
                  style="width:26px;height:26px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;margin-left:-6px;flex-shrink:0;cursor:pointer;">
               ${this._esc((m.name ?? "?").charAt(0).toUpperCase())}
             </div>`
      ).join("");
      const extraMembers = members.length > 5
          ? `<div style="width:26px;height:26px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:0.6rem;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;margin-left:-6px;flex-shrink:0;">+${members.length - 5}</div>`
          : "";

      const areaCells = ALL_AREAS.map(area => {
        const isActive = requiredAreas.includes(area);
        if (!isActive) {
          return `<td style="text-align:center;padding:12px 8px;vertical-align:middle;">
            <span style="font-size:0.7rem;color:#d1d5db;font-weight:600;">N/A</span>
          </td>`;
        }
        const count = areas[area] ?? 0;
        const hasCoverage = count > 0;
        const color = hasCoverage ? "var(--mint)" : "var(--text-muted)";
        const dotColor = hasCoverage ? "var(--mint)" : "#e2e8f0";
        return `
          <td style="text-align:center;padding:12px 8px;vertical-align:middle;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
              <span style="font-size:0.7rem;font-weight:700;color:${color};">${count}</span>
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dotColor};"></span>
            </div>
          </td>`;
      }).join("");

      return `
        <tr class="db-team-row" data-team-id="${this._esc(team.id_team)}" tabindex="0"
            style="border-bottom:1px solid var(--border);transition:background .15s;cursor:pointer;"
            onmouseover="this.style.background='var(--accent-dim)'"
            onmouseout="this.style.background='transparent'">
          <td style="padding:12px 16px;vertical-align:middle;min-width:160px;">
            <div style="font-weight:700;color:var(--navy);font-size:0.875rem;">${this._esc(team.name)}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this._esc(team.description ?? "")}</div>
          </td>
          <td style="padding:12px 16px;vertical-align:middle;">
            <div style="display:flex;align-items:center;margin-left:6px;">
              ${avatarsHtml}${extraMembers}
            </div>
          </td>
          ${areaCells}
        </tr>`;
    }).join("");
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

  _renderProgressAreaInactive(label, idx) {
    const areaLabels = {
      DEVELOPMENT: t("tl.areaDev") || "Development",
      SOFT_SKILLS: t("tl.areaSoft") || "Soft Skills",
      ENGLISH:     t("tl.areaEnglish") || "English",
    };
    return `
      <div class="db-progress-item" style="opacity:0.4;">
        <div class="db-progress-info">
          <span class="db-progress-label">${areaLabels[label] ?? label}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);">N/A</span>
        </div>
        <div class="db-progress-bar-bg" style="width:100%;height:6px;background:#f0f0f0;">
          <div style="width:0%;height:6px;background:#e2e8f0;"></div>
        </div>
        <div class="mt-2 d-flex align-items-center gap-1" style="border-top:1px solid #f0f0f0;padding-top:6px;">
          <span style="font-size:0.72rem;color:var(--text-muted);">${t("dashboard.areaNotRequired") || "No requerida en este evento"}</span>
        </div>
      </div>
    `;
  }

  _renderProgressArea(label, current, total, color, missingTeams = []) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const areaLabels = {
      DEVELOPMENT: t("tl.areaDev") || "Development",
      SOFT_SKILLS: t("tl.areaSoft") || "Soft Skills",
      ENGLISH:     t("tl.areaEnglish") || "English",
    };
    const displayLabel = areaLabels[label] ?? label;

    const missingHtml = total === 0 ? "" : missingTeams.length > 0
        ? `<div class="mt-2" style="border-top:1px solid #f0f0f0;padding-top:6px;">
           <p class="mb-1" style="font-size:0.7rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;">
             ${missingTeams.length} ${t("dashboard.pendingTeams") || "sin calificar"}
           </p>
           <div class="d-flex flex-column gap-1">
             ${missingTeams.slice(0, 4).map(name => `
               <div class="d-flex align-items-center gap-1">
                 <span class="material-icons-round" style="font-size:.75rem;color:var(--text-muted);">schedule</span>
                 <span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${name}</span>
               </div>`).join("")}
             ${missingTeams.length > 4
            ? `<span style="font-size:0.7rem;color:var(--text-muted);">+${missingTeams.length - 4} más</span>`
            : ""}
           </div>
         </div>`
        : `<div class="mt-2 d-flex align-items-center gap-1" style="border-top:1px solid #f0f0f0;padding-top:6px;">
           <span class="material-icons-round" style="font-size:.85rem;color:var(--mint);">check_circle</span>
           <span style="font-size:0.72rem;color:var(--mint);font-weight:600;">${t("dashboard.allEvaluated") || "Todos calificados"}</span>
         </div>`;

    return `
      <div class="db-progress-item">
        <div class="db-progress-info">
          <span class="db-progress-label">${displayLabel}</span>
          <span class="db-progress-count">${current}<span>/${total} ${t("dashboard.teams")}</span></span>
        </div>
        <div class="db-progress-bar-bg" style="width: 100%; height: 6px; background: #f0f0f0;">
          <div class="db-progress-bar-fill" style="width: ${percentage}%; background: ${color}"></div>
        </div>
        ${missingHtml}
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
    const cv = this.evalCoverage;

    // ── Eval close/reopen block (always visible when event is not finished) ──
    const evalBlock = !isFinished && cv ? (() => {
      const isClosed  = cv.evaluations_closed;
      const canClose  = cv.canClose;
      const missing   = cv.missing ?? [];

      // Hide completely if nothing has been evaluated yet
      // (all teams appear in missing with all areas absent)
      const totalMissingAreas = missing.reduce((sum, m) => sum + (m.missingAreas?.length ?? 0), 0);
      const totalRequiredAreas = missing.length > 0
          ? missing[0].missingAreas?.length ?? 0
          : 0;
      const noEvaluationsAtAll = !isClosed && !canClose && missing.length > 0
          && totalMissingAreas === missing.length * totalRequiredAreas
          && totalRequiredAreas > 0;

      if (noEvaluationsAtAll) return "";

      if (isClosed) {
        return `
          <div class="d-flex align-items-center justify-content-between gap-2 px-3 py-2 rounded-3 mb-1"
               style="background:var(--accent-dim);border:1px solid var(--border-card);">
            <div class="d-flex align-items-center gap-2">
              <span class="material-icons-round" style="font-size:1rem;color:var(--accent);">lock</span>
              <span class="small fw-bold" style="color:var(--accent);">${t("dashboard.evalsClosedBadge") || "Calificaciones cerradas"}</span>
            </div>
            <button id="btn-reopen-evals"
                    style="background:transparent;border:2px solid var(--accent);color:var(--accent);border-radius:999px;padding:4px 14px;font-size:0.75rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .2s;"
                    onmouseover="this.style.background='var(--accent)';this.style.color='white';"
                    onmouseout="this.style.background='transparent';this.style.color='var(--accent)';">
              <span class="material-icons-round" style="font-size:.8rem;vertical-align:middle;">lock_open</span>
              ${t("tl.reopenEvals") || "Reabrir"}
            </button>
          </div>`;
      }

      const warnText = !canClose && missing.length > 0
          ? `<span class="small" style="color:var(--text-muted);font-size:0.72rem;">
             ${missing.length} proyecto(s) sin cobertura completa
           </span>`
          : "";

      return `
        <div class="d-flex align-items-center justify-content-between gap-3 px-3 py-2 rounded-3 mb-1"
             style="background:var(--accent-dim);border:1px solid var(--border-card);">
          <div class="d-flex align-items-center gap-2 flex-shrink-0">
            <span class="material-icons-round" style="font-size:1rem;color:var(--accent);">
              ${canClose ? "check_circle" : "pending"}
            </span>
            <div class="d-flex flex-column" style="line-height:1.2;">
              <span class="small fw-bold" style="color:var(--navy);">
                ${canClose
          ? (t("tl.allEvalsComplete") || "Todas las áreas calificadas")
          : (t("tl.evalsPending") || `${missing.length} equipo(s) sin calificar`)}
              </span>
              ${warnText}
            </div>
          </div>
          <button id="btn-close-evals"
                  data-has-missing="${missing.length > 0}"
                  data-missing-count="${missing.length}"
                  ${canClose ? "" : "disabled"}
                  style="background:var(--accent);border:none;color:white;border-radius:999px;padding:6px 16px;font-size:0.75rem;font-weight:600;cursor:${canClose ? "pointer" : "not-allowed"};opacity:${canClose ? "1" : ".55"};white-space:nowrap;flex-shrink:0;transition:all .2s;"
                  ${canClose ? `onmouseover="this.style.background='var(--color-primary-dark)';" onmouseout="this.style.background='var(--accent)';"` : ""}>
            <span class="material-icons-round" style="font-size:.8rem;vertical-align:middle;margin-right:4px;">lock</span>
            ${t("tl.closeEvals") || "Cerrar calificaciones"}
          </button>
        </div>`;
    })() : "";

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
      ${evalBlock}
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
    document.getElementById("db-retry-btn")?.addEventListener("click", () => {
      this._loadDashboardData();
    });

    document
        .querySelector(".navigate-ranking")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          this.router.navigate("ranking");
        });

    document.getElementById("db-edit-event-btn")?.addEventListener("click", () => {
      if (this.eventId) {
        this.router.navigate("events/edit", { eventId: this.eventId });
      }
    });

    document.getElementById("db-teams-excel-btn")?.addEventListener("click", async () => {
      const btn = document.getElementById("db-teams-excel-btn");
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner-border spinner-border-sm" style="width:.85rem;height:.85rem;"></span>
        <span>${t("dashboard.generatingExcel")}</span>
      `;

      try {
        const teams = await this._fetchAllTeamsForReport();
        if (!teams.length) {
          toast.info(t("dashboard.reportEmptyTitle"), t("dashboard.reportEmptyMsg"));
          return;
        }
        this._downloadTeamsExcel(teams);
        toast.success(t("dashboard.excelReadyTitle"), t("dashboard.excelReadyMsg"));
      } catch (err) {
        console.error("Teams Excel report error:", err);
        toast.error(t("common.errorTitle"), err?.message ?? t("dashboard.excelError"));
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    });

    // ── Team search ────────────────────────────────────────────────────────
    const teamSearch = document.getElementById("db-team-search");
    if (teamSearch) {
      teamSearch.addEventListener("input", (e) => {
        this.teamSearch = e.target.value;
        const cursorPos = e.target.selectionStart;
        const scrollY = window.scrollY;

        const tableWrap = document.getElementById("db-teams-table-wrap");
        if (tableWrap) {
          tableWrap.innerHTML = this._renderTeamsTable();
        }

        // Restore scroll and cursor
        window.scrollTo({ top: scrollY, behavior: "instant" });
        requestAnimationFrame(() => {
          const input = document.getElementById("db-team-search");
          if (input) {
            input.focus();
            input.setSelectionRange(cursorPos, cursorPos);
          }
        });
      });
    }

    const teamsTable = document.getElementById("db-teams-table-wrap");
    if (teamsTable && !teamsTable.dataset.teamNavAttached) {
      teamsTable.dataset.teamNavAttached = "true";

      teamsTable.addEventListener("click", (e) => {
        if (e.target.closest(".ct-member-clickable")) return;
        const row = e.target.closest(".db-team-row[data-team-id]");
        if (!row) return;
        this.router.navigate("teamDetail", { teamId: row.dataset.teamId });
      });

      teamsTable.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target.closest(".ct-member-clickable")) return;
        const row = e.target.closest(".db-team-row[data-team-id]");
        if (!row) return;
        e.preventDefault();
        this.router.navigate("teamDetail", { teamId: row.dataset.teamId });
      });
    }

    // ── Close evaluations ──────────────────────────────────────────────────
    document.getElementById("btn-close-evals")?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-close-evals");
      const hasMissing = btn.dataset.hasMissing === "true";
      const missingCount = parseInt(btn.dataset.missingCount ?? "0");

      if (hasMissing) {
        toast.error(
            t("common.errorTitle"),
            `${missingCount} proyecto(s) deben tener al menos una calificación por área activa.`,
        );
        return;
      }

      const confirmMsg = t("tl.closeEvalsConfirm") || "¿Cerrar las calificaciones? Los TLs ya no podrán enviar más evaluaciones.";

      if (!confirm(confirmMsg)) return;

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" style="width:.75rem;height:.75rem;"></span>`;

      try {
        await closeEventEvaluations(this.eventId);
        this.evalCoverage = await getEventEvalCoverage(this.eventId);
        toast.success(t("tl.evalsClosedBadge") || "Calificaciones cerradas", t("tl.evalsClosedDesc") || "Los TLs ya no pueden enviar calificaciones.");
        this._paint();
        this._attachLocalHandlers();
      } catch (err) {
        toast.error(t("common.errorTitle"), err?.message ?? "No se pudo cerrar.");
        btn.disabled = false;
      }
    });

    // ── Reopen evaluations ─────────────────────────────────────────────────
    document.getElementById("btn-reopen-evals")?.addEventListener("click", async () => {
      if (!confirm(t("tl.reopenEvalsConfirm") || "¿Reabrir las calificaciones?")) return;

      const btn = document.getElementById("btn-reopen-evals");
      btn.disabled = true;

      try {
        await reopenEventEvaluations(this.eventId);
        this.evalCoverage = await getEventEvalCoverage(this.eventId);
        toast.success(t("tl.reopenEvals") || "Calificaciones reabiertas", "");
        this._paint();
        this._attachLocalHandlers();
      } catch (err) {
        toast.error(t("common.errorTitle"), err?.message ?? "No se pudo reabrir.");
        btn.disabled = false;
      }
    });

    // ── Publish / reopen event ─────────────────────────────────────────────
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

  _initAvatarTooltip() {
    if (document.getElementById("app-avatar-tip")) return;

    const tip = document.createElement("span");
    tip.id = "app-avatar-tip";
    document.body.appendChild(tip);

    this._avatarMouseOver = (e) => {
      const avatar = e.target.closest(".app-avatar-has-tip");
      if (!avatar) return;
      tip.textContent = avatar.dataset.tipName ?? "";
      tip.classList.add("visible");
      const rect = avatar.getBoundingClientRect();
      tip.style.left = `${rect.left + rect.width / 2 - tip.offsetWidth / 2}px`;
      tip.style.top = `${rect.top - tip.offsetHeight - 8}px`;
    };

    this._avatarMouseOut = (e) => {
      if (!e.target.closest(".app-avatar-has-tip")) return;
      tip.classList.remove("visible");
    };

    document.addEventListener("mouseover", this._avatarMouseOver);
    document.addEventListener("mouseout", this._avatarMouseOut);
  }

  _esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async _fetchAllTeamsForReport() {
    const limit = 100;
    let page = 1;
    let totalPages = 1;
    const teams = [];

    do {
      const response = await apiFetch(
        `/teams?idEvent=${encodeURIComponent(this.eventId)}&page=${page}&limit=${limit}&includeSubmitted=true&includeClosed=true`,
        { method: "GET" },
      );
      const payload = response?.data ?? response ?? {};
      const pageTeams = payload.teams ?? [];
      teams.push(...pageTeams);
      totalPages = payload.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    this.allTeams = teams;
    return teams;
  }

  _downloadTeamsExcel(teams) {
    const workbook = XLSX.utils.book_new();
    const sortedTeams = [...teams].sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "es", { sensitivity: "base" }),
    );
    const event = this.eventInfo ?? {};
    const eventName = event.title || event.event_name || this.eventName || "Evento";
    const createdAt = new Date();
    const createdDate = this._formatReportDateForFile(createdAt);

    const teamsRows = sortedTeams.map((team, index) => {
      const members = team.members ?? [];
      const leader = members.find((member) => member.team_role === "LEADER");
      const clans = [...new Set(members.map((member) => member.clan).filter(Boolean))];
      const memberNames = members.length
        ? members.map((member) => member.name || "Integrante sin nombre").join(", ")
        : "Sin integrantes registrados";

      return {
        "#": index + 1,
        "ID equipo": team.id_team ?? "",
        "Equipo": team.name || "Equipo sin nombre",
        "Descripción": String(team.description ?? "").trim() || "Sin descripción registrada",
        "Total integrantes": this._teamMemberCount(team),
        "Integrantes": memberNames,
        "Líder": leader?.name || "Sin líder registrado",
        "Clanes": clans.length ? clans.join(", ") : "Sin clan registrado",
        "Estado": team.closed_at ? "Cerrado" : "Abierto",
        "Fecha de creación del equipo": this._formatReportDate(team.created_at),
      };
    });

    const teamsSheet = XLSX.utils.json_to_sheet(teamsRows);

    teamsSheet["!cols"] = [
      { wch: 6 },
      { wch: 10 },
      { wch: 28 },
      { wch: 60 },
      { wch: 18 },
      { wch: 60 },
      { wch: 28 },
      { wch: 36 },
      { wch: 14 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, teamsSheet, "Equipos");

    workbook.Props = {
      Title: `Reporte de equipos - ${eventName} - ${createdDate}`,
      Subject: "Reporte de equipos por evento",
      Author: "TeamUp",
      Company: "TeamUp",
      CreatedDate: createdAt,
    };

    XLSX.writeFile(workbook, `${this._fileSafeName(`reporte-equipos-${eventName}-${createdDate}`)}.xlsx`);
  }

  _buildTeamsReportHtml(teams) {
    const sortedTeams = [...teams].sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "es", { sensitivity: "base" }),
    );
    const event = this.eventInfo ?? {};
    const eventName = event.title || event.event_name || this.eventName || "Evento";
    const generatedAt = new Date().toLocaleString("es-CO", {
      dateStyle: "long",
      timeStyle: "short",
    });
    const logoSrc = new URL(logoUrl, window.location.origin).href;
    const totalTeams = sortedTeams.length;
    const totalMembers = sortedTeams.reduce((sum, team) => sum + this._teamMemberCount(team), 0);
    const closedTeams = sortedTeams.filter((team) => team.closed_at).length;
    const teamsWithoutDescription = sortedTeams.filter((team) => !String(team.description ?? "").trim()).length;
    const emptyTeams = sortedTeams.filter((team) => this._teamMemberCount(team) === 0).length;
    const averageMembers = totalTeams > 0 ? (totalMembers / totalTeams).toFixed(1) : "0";
    const clanCounts = new Map();

    sortedTeams.forEach((team) => {
      (team.members ?? []).forEach((member) => {
        const clan = member.clan || "Sin clan";
        clanCounts.set(clan, (clanCounts.get(clan) ?? 0) + 1);
      });
    });

    const topClans = [...clanCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const eventMeta = [
      event.route ? `Ruta: ${event.route}` : null,
      event.cohort ? `Cohorte: ${event.cohort}` : null,
      event.max_team_size ? `Máximo por equipo: ${event.max_team_size}` : null,
      event.status ? `Estado: ${this._reportStatusLabel(event.status)}` : null,
    ].filter(Boolean);

    return `<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Reporte de equipos - ${this._esc(eventName)}</title>
          <style>
            :root {
              --accent: #6b5cff;
              --navy: #181e4b;
              --lilac: #eaa2fc;
              --mint: #5acca4;
              --coral: #fe654f;
              --gold: #e6ca52;
              --ink: #263052;
              --muted: #6f759a;
              --soft: #f4f3ff;
              --line: rgba(107, 92, 255, 0.16);
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #eef1f7;
              color: var(--ink);
              font-family: Ubuntu, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.45;
            }
            .page {
              width: min(1120px, calc(100% - 32px));
              margin: 24px auto;
              background: #fff;
              border-radius: 18px;
              overflow: hidden;
              box-shadow: 0 18px 50px rgba(24, 30, 75, 0.12);
            }
            .hero {
              position: relative;
              padding: 34px 38px;
              color: white;
              background:
                linear-gradient(120deg, rgba(24, 30, 75, 0.96), rgba(107, 92, 255, 0.92)),
                radial-gradient(circle at 90% 20%, rgba(90, 204, 164, 0.45), transparent 28%);
            }
            .hero::after {
              content: "";
              position: absolute;
              right: 0;
              bottom: 0;
              width: 42%;
              height: 8px;
              background: linear-gradient(90deg, var(--mint), var(--lilac), var(--coral), var(--gold));
            }
            .brand-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              margin-bottom: 28px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 12px;
              font-weight: 800;
              letter-spacing: .02em;
            }
            .brand img {
              width: 44px;
              height: 44px;
              border-radius: 11px;
              background: white;
              padding: 5px;
            }
            .generated {
              color: rgba(255, 255, 255, 0.78);
              font-size: 12px;
              text-align: right;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 36px;
              line-height: 1.08;
              letter-spacing: 0;
            }
            .event-name {
              margin: 0;
              color: rgba(255, 255, 255, 0.86);
              font-size: 16px;
              max-width: 820px;
            }
            .event-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 18px;
            }
            .pill {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              padding: 7px 11px;
              background: rgba(255, 255, 255, 0.12);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: rgba(255, 255, 255, 0.9);
              font-size: 12px;
              font-weight: 700;
            }
            .content { padding: 30px 38px 38px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 24px;
            }
            .metric {
              border: 1px solid var(--line);
              border-radius: 14px;
              padding: 15px;
              background: linear-gradient(180deg, #fff, #fbfbff);
              min-height: 96px;
            }
            .metric span {
              display: block;
              color: var(--muted);
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .metric strong {
              display: block;
              margin-top: 10px;
              color: var(--navy);
              font-size: 28px;
              line-height: 1;
            }
            .manager-grid {
              display: grid;
              grid-template-columns: 1.15fr .85fr;
              gap: 16px;
              margin-bottom: 26px;
            }
            .panel {
              border: 1px solid var(--line);
              border-radius: 14px;
              padding: 18px;
              background: var(--soft);
            }
            .panel h2 {
              margin: 0 0 12px;
              color: var(--navy);
              font-size: 16px;
            }
            .insights {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 10px;
            }
            .insight {
              background: #fff;
              border: 1px solid var(--line);
              border-radius: 12px;
              padding: 12px;
            }
            .insight strong {
              display: block;
              color: var(--navy);
              font-size: 20px;
            }
            .insight span {
              color: var(--muted);
              font-size: 12px;
            }
            .clans {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .clan {
              border-radius: 999px;
              padding: 7px 10px;
              background: white;
              border: 1px solid var(--line);
              color: var(--navy);
              font-size: 12px;
              font-weight: 700;
            }
            .section-title {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              margin: 10px 0 16px;
            }
            .section-title h2 {
              margin: 0;
              color: var(--navy);
              font-size: 20px;
            }
            .print-btn {
              border: 0;
              border-radius: 999px;
              padding: 10px 16px;
              background: var(--accent);
              color: white;
              font-weight: 800;
              cursor: pointer;
            }
            .team-list {
              display: grid;
              gap: 14px;
            }
            .team-card {
              border: 1px solid var(--line);
              border-radius: 16px;
              overflow: hidden;
              background: #fff;
              break-inside: avoid;
            }
            .team-head {
              display: grid;
              grid-template-columns: 44px 1fr auto;
              align-items: center;
              gap: 14px;
              padding: 16px 18px;
              border-bottom: 1px solid var(--line);
              background: linear-gradient(90deg, rgba(107, 92, 255, 0.08), rgba(90, 204, 164, 0.08));
            }
            .number {
              width: 36px;
              height: 36px;
              display: grid;
              place-items: center;
              border-radius: 10px;
              background: var(--accent);
              color: white;
              font-weight: 900;
            }
            .team-title h3 {
              margin: 0;
              color: var(--navy);
              font-size: 17px;
            }
            .team-title p {
              margin: 4px 0 0;
              color: var(--muted);
              font-size: 12px;
            }
            .status {
              border-radius: 999px;
              padding: 7px 11px;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .status.open { background: rgba(90, 204, 164, 0.15); color: #1a8f6c; }
            .status.closed { background: rgba(254, 101, 79, 0.13); color: #d94831; }
            .team-body {
              display: grid;
              grid-template-columns: 1fr 1.2fr;
              gap: 18px;
              padding: 18px;
            }
            .description h4,
            .members h4 {
              margin: 0 0 8px;
              color: var(--navy);
              font-size: 12px;
              text-transform: uppercase;
            }
            .description p {
              margin: 0;
              color: var(--ink);
              font-size: 13px;
            }
            .empty {
              color: var(--muted);
              font-style: italic;
            }
            .member-list {
              display: grid;
              gap: 8px;
            }
            .member {
              display: grid;
              grid-template-columns: 32px 1fr auto;
              align-items: center;
              gap: 9px;
              border: 1px solid rgba(24, 30, 75, 0.08);
              border-radius: 11px;
              padding: 8px;
              background: #fcfcff;
            }
            .avatar {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              object-fit: cover;
              background: rgba(107, 92, 255, 0.12);
              color: var(--accent);
              display: grid;
              place-items: center;
              font-weight: 900;
              font-size: 12px;
            }
            .member-name {
              color: var(--navy);
              font-weight: 800;
              font-size: 13px;
            }
            .member-meta {
              color: var(--muted);
              font-size: 11px;
            }
            .role {
              color: var(--accent);
              background: rgba(107, 92, 255, 0.1);
              border-radius: 999px;
              padding: 5px 8px;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
            }
            @media (max-width: 860px) {
              .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .manager-grid,
              .team-body { grid-template-columns: 1fr; }
              .team-head { grid-template-columns: 38px 1fr; }
              .status { grid-column: 2; justify-self: start; }
            }
            @media print {
              body { background: white; }
              .page {
                width: 100%;
                margin: 0;
                border-radius: 0;
                box-shadow: none;
              }
              .print-btn { display: none; }
              .content { padding: 22px; }
              .hero { padding: 26px 22px; }
              .summary { grid-template-columns: repeat(5, 1fr); }
              .team-card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <article class="page">
            <header class="hero">
              <div class="brand-row">
                <div class="brand">
                  <img src="${logoSrc}" alt="TeamUp">
                  <span>TeamUp</span>
                </div>
                <div class="generated">
                  Generado el<br>
                  <strong>${this._esc(generatedAt)}</strong>
                </div>
              </div>
              <h1>Reporte de equipos</h1>
              <p class="event-name">${this._esc(eventName)}</p>
              ${eventMeta.length ? `<div class="event-meta">${eventMeta.map((item) => `<span class="pill">${this._esc(item)}</span>`).join("")}</div>` : ""}
            </header>

            <main class="content">
              <section class="summary" aria-label="Resumen ejecutivo">
                ${this._reportMetric("Equipos", totalTeams)}
                ${this._reportMetric("Integrantes", totalMembers)}
                ${this._reportMetric("Promedio por equipo", averageMembers)}
                ${this._reportMetric("Equipos abiertos", totalTeams - closedTeams)}
                ${this._reportMetric("Equipos cerrados", closedTeams)}
              </section>

              <section class="manager-grid">
                <div class="panel">
                  <h2>Lectura rápida para manager</h2>
                  <div class="insights">
                    ${this._reportInsight(teamsWithoutDescription, "equipos sin descripción")}
                    ${this._reportInsight(emptyTeams, "equipos sin integrantes")}
                    ${this._reportInsight(this._largestTeamSize(sortedTeams), "integrantes en el equipo más grande")}
                  </div>
                </div>
                <div class="panel">
                  <h2>Distribución por clan</h2>
                  <div class="clans">
                    ${topClans.length
                      ? topClans.map(([clan, count]) => `<span class="clan">${this._esc(clan)} · ${count}</span>`).join("")
                      : `<span class="empty">Sin información de clan disponible</span>`}
                  </div>
                </div>
              </section>

              <section>
                <div class="section-title">
                  <h2>Detalle de equipos</h2>
                  <button class="print-btn" type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
                </div>
                <div class="team-list">
                  ${sortedTeams.map((team, index) => this._reportTeamCard(team, index)).join("")}
                </div>
              </section>
            </main>
          </article>
        </body>
      </html>`;
  }

  _reportMetric(label, value) {
    return `
      <div class="metric">
        <span>${this._esc(label)}</span>
        <strong>${this._esc(value)}</strong>
      </div>`;
  }

  _reportInsight(value, label) {
    return `
      <div class="insight">
        <strong>${this._esc(value)}</strong>
        <span>${this._esc(label)}</span>
      </div>`;
  }

  _reportTeamCard(team, index) {
    const members = team.members ?? [];
    const memberCount = this._teamMemberCount(team);
    const description = String(team.description ?? "").trim();
    const isClosed = !!team.closed_at;

    return `
      <article class="team-card">
        <div class="team-head">
          <div class="number">${index + 1}</div>
          <div class="team-title">
            <h3>${this._esc(team.name || "Equipo sin nombre")}</h3>
            <p>${memberCount} integrante${memberCount === 1 ? "" : "s"}</p>
          </div>
          <span class="status ${isClosed ? "closed" : "open"}">${isClosed ? "Cerrado" : "Abierto"}</span>
        </div>
        <div class="team-body">
          <div class="description">
            <h4>Descripción</h4>
            <p class="${description ? "" : "empty"}">${description ? this._esc(description) : "Sin descripción registrada."}</p>
          </div>
          <div class="members">
            <h4>Integrantes</h4>
            <div class="member-list">
              ${members.length
                ? members.map((member) => this._reportMember(member)).join("")
                : `<p class="empty">No hay integrantes registrados.</p>`}
            </div>
          </div>
        </div>
      </article>`;
  }

  _reportMember(member) {
    const initial = String(member.name ?? member.email ?? "?").charAt(0).toUpperCase();
    const clan = member.clan || "Sin clan";
    const role = this._reportRoleLabel(member.team_role);

    return `
      <div class="member">
        ${member.github_avatar_url
          ? `<img class="avatar" src="${this._esc(member.github_avatar_url)}" alt="${this._esc(member.name)}">`
          : `<div class="avatar">${this._esc(initial)}</div>`}
        <div>
          <div class="member-name">${this._esc(member.name || "Integrante sin nombre")}</div>
          <div class="member-meta">${this._esc(clan)}</div>
        </div>
        <span class="role">${this._esc(role)}</span>
      </div>`;
  }

  _reportRoleLabel(role) {
    const roles = {
      LEADER: "Líder",
      DEVELOPER: "Integrante",
      MEMBER: "Integrante",
    };
    return roles[role] ?? "Integrante";
  }

  _reportStatusLabel(status) {
    const statuses = {
      UPCOMING: "Próximo",
      IN_PROGRESS: "En progreso",
      FINISHED: "Finalizado",
      COMPLETED: "Completado",
    };
    return statuses[status] ?? status;
  }

  _formatReportDate(value) {
    if (!value) return "No registrada";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No registrada";
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  _formatReportDateForFile(value) {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  _fileSafeName(value) {
    return String(value ?? "reporte")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 90) || "reporte-equipos";
  }

  _largestTeamSize(teams) {
    return teams.reduce((max, team) => {
      const size = this._teamMemberCount(team);
      return Math.max(max, size);
    }, 0);
  }

  _teamMemberCount(team) {
    if (Array.isArray(team.members)) return team.members.length;
    const count = Number(team.member_count);
    return Number.isFinite(count) ? count : 0;
  }

  destroy() {
    abortStateRequest(this._dashboardRequest);
    if (this._offLangChange) this._offLangChange();
    if (this._avatarMouseOver) {
      document.removeEventListener("mouseover", this._avatarMouseOver);
    }
    if (this._avatarMouseOut) {
      document.removeEventListener("mouseout", this._avatarMouseOut);
    }
    const tip = document.getElementById("app-avatar-tip");
    if (tip) tip.remove();
  }
}
