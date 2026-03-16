import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { apiFetch, getEventEvalCoverage, closeEventEvaluations, reopenEventEvaluations, getTeamEvalCounts } from "../services/api.js";
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
    this.evalCoverage = null; // { evaluations_closed, canClose, missing[] }
    this.teamEvalCounts = []; // [{ id_team, team_name, areas: { DEVELOPMENT: N, ... } }]
    this.allTeams = [];       // full team objects with members
    this.teamSearch = "";
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
      const [metricsRes, rankingRes, statusRes, eventRes, coverageRes, teamCountsRes, teamsRes] = await Promise.allSettled([
        apiFetch(`/events/${this.eventId}/metrics`, { method: "GET" }),
        apiFetch(`/events/${this.eventId}/ranking`, { method: "GET" }),
        apiFetch(`/events/${this.eventId}/ranking/status`, { method: "GET" }),
        apiFetch(`/events/${this.eventId}`, { method: "GET" }),
        getEventEvalCoverage(this.eventId),
        getTeamEvalCounts(this.eventId),
        apiFetch(`/teams?idEvent=${this.eventId}&limit=100&includeSubmitted=true`, { method: "GET" }),
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
      if (coverageRes.status === "fulfilled") {
        this.evalCoverage = coverageRes.value ?? null;
      }
      if (teamCountsRes.status === "fulfilled") {
        this.teamEvalCounts = Array.isArray(teamCountsRes.value) ? teamCountsRes.value : [];
      }
      if (teamsRes.status === "fulfilled") {
        this.allTeams = teamsRes.value?.data?.teams ?? teamsRes.value?.teams ?? [];
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
    const MAX = 3;

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
              ? `<img src="${m.github_avatar_url}" alt="${m.name}" title="${m.name}"
                  style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:2px solid white;margin-left:-6px;flex-shrink:0;">`
              : `<div title="${m.name}"
                  style="width:26px;height:26px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:0.65rem;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;margin-left:-6px;flex-shrink:0;">
               ${(m.name ?? "?").charAt(0).toUpperCase()}
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
        const dots = Array.from({ length: MAX }, (_, i) => {
          const filled = i < count;
          const color = count === MAX ? "var(--mint)" : count > 0 ? "var(--accent)" : "#e2e8f0";
          return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${filled ? color : "#e2e8f0"};"></span>`;
        }).join("");
        return `
          <td style="text-align:center;padding:12px 8px;vertical-align:middle;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
              <span style="font-size:0.7rem;font-weight:700;color:${count === MAX ? "var(--mint)" : count > 0 ? "var(--accent)" : "var(--text-muted)"};">${count}/${MAX}</span>
              <div style="display:flex;gap:3px;">${dots}</div>
            </div>
          </td>`;
      }).join("");

      return `
        <tr style="border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background='var(--accent-dim)'" onmouseout="this.style.background='transparent'">
          <td style="padding:12px 16px;vertical-align:middle;min-width:160px;">
            <div style="font-weight:700;color:var(--navy);font-size:0.875rem;">${team.name}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${team.description ?? ""}</div>
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
                  style="background:var(--accent);border:none;color:white;border-radius:999px;padding:6px 16px;font-size:0.75rem;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s;"
                  onmouseover="this.style.background='var(--color-primary-dark)';"
                  onmouseout="this.style.background='var(--accent)';">
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
    document
        .querySelector(".navigate-ranking")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          this.router.navigate("ranking");
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

    // ── Close evaluations ──────────────────────────────────────────────────
    document.getElementById("btn-close-evals")?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-close-evals");
      const hasMissing = btn.dataset.hasMissing === "true";
      const missingCount = parseInt(btn.dataset.missingCount ?? "0");

      const confirmMsg = hasMissing
          ? `⚠️ ${missingCount} proyecto(s) no tienen todas las áreas calificadas.\n\nAl cerrar, se calculará la nota con las evaluaciones existentes.\n\n¿Deseas cerrar de todas formas?`
          : (t("tl.closeEvalsConfirm") || "¿Cerrar las calificaciones? Los TLs ya no podrán enviar más evaluaciones.");

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

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
