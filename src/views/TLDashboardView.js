//import "../assets/styles/coderHome.css";
//import "../assets/styles/coderTeam.css";
import "../assets/styles/tldashboard.css";
import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { t, onLangChange } from "../utils/i18n.js";
import { apiFetch } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import {
  renderCoderTeam,
  loadProjectBrief,
  loadComments,
  loadEvaluationPanel,
} from "./coderTeam.js";

const TL_ROLES = ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "ADMIN"];

export default class TLDashboardView {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);

    this.selectedEvent = router?.currentParams?.selectedEvent ?? null;
    if (!this.selectedEvent) {
      try {
        const stored = sessionStorage.getItem("selectedEvent");
        if (stored) this.selectedEvent = JSON.parse(stored);
      } catch (_) { }
    }

    this.teams = [];
    this.isLoading = true;
    this.error = null;
    this.searchQuery = "";
    this.evalCoverage = null; // { evaluations_closed, canClose, missing[] }
    this.isAdmin = this.user?.role === "ADMIN";

    // Detail mode — when a TL clicks "Evaluate" on a team
    this.detailTeam = null;
    this.commentsCleanup = null;
  }

  async init() {
    this.render();
    this.navbar.attachEventHandlers();
    await this._loadTeams();
  }

  async _loadTeams() {
    if (!this.selectedEvent?.id) {
      this.error = t("tl.noEventSelected");
      toast.error(t("common.errorTitle"), this.error);
      this.isLoading = false;
      this._renderList();
      return;
    }

    try {
      const res = await apiFetch(
          `/teams?idEvent=${this.selectedEvent.id}&limit=100&includeSubmitted=true`,
          { method: "GET" },
      );
      const raw = res?.data?.teams ?? res?.teams ?? [];

      const {
        getProjectEvalStatus,
        getEventEvalCoverage,
      } = await import("../services/api.js");

      // Enrich each team with project + member count + eval status
      this.teams = await Promise.all(
          raw.map(async (t) => {
            try {
              const detail = await apiFetch(`/teams/${t.id_team}`, {
                method: "GET",
              });
              const full = detail?.data ?? detail;
              const projectId = full.project?.id_project ?? null;

              let _alreadyEvaluated = false;
              let _evalStatus = null; // { evaluations_closed, area_closed, already_submitted, evaluator_count }

              if (projectId) {
                try {
                  const { getMyEvaluationsForProject } = await import("../services/api.js");
                  const [evals, evalStatus] = await Promise.all([
                    getMyEvaluationsForProject(projectId),
                    getProjectEvalStatus(projectId),
                  ]);
                  _alreadyEvaluated = Array.isArray(evals) && evals.length > 0;
                  _evalStatus = evalStatus;
                } catch (_) {}
              }

              return {
                ...t,
                members: full.members ?? [],
                project: full.project ?? null,
                _alreadyEvaluated,
                _evalStatus,
              };
            } catch {
              return { ...t, members: [], project: null, _alreadyEvaluated: false, _evalStatus: null };
            }
          }),
      );

      // For ADMIN: also fetch event-level coverage
      if (this.isAdmin && this.selectedEvent?.id) {
        try {
          this.evalCoverage = await getEventEvalCoverage(this.selectedEvent.id);
        } catch (_) {
          this.evalCoverage = null;
        }
      }
    } catch (err) {
      this.error = t("tl.loadError");
      toast.error(t("common.errorTitle"), this.error);
    }

    this.isLoading = false;
    this._renderList();
    this._attachListHandlers();
  }

  // ── Full page render (shell + navbar) ──────────────────────────────────────
  render() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      ${this.navbar.render()}
      <div id="overlay" class="sidebar-overlay"></div>
      <div style="display:flex;flex-direction:column;width:100%">
        ${this.header.render()}
        <main class="coder-home-main flex-grow-1">
          <div id="tl-content"></div>
        </main>
      </div>
    `;

    //this.navbar.attachEventHandlers();
    this.header.mountBreadcrumb();
    this.header.attachEventHandlers();
    this._renderList();
    if (!this._offLangChange) {
      this._offLangChange = onLangChange(() => {
        if (this.detailTeam) {
          this._renderDetail(this.detailTeam);
        } else {
          this.render();
        }
      });
    }
  }

  // ── Teams list ─────────────────────────────────────────────────────────────
  _renderList() {
    const content = document.getElementById("tl-content");
    if (!content) return;

    content.innerHTML = `
      <div class="tld-page">

        <header class="tld-header">
          <div class="tld-header-top">
            <div>
              <p class="tld-eyebrow">Team Lead · ${this._roleLabel()}</p>
              <h1 class="tld-title">${this.selectedEvent?.title ?? "Teams"}</h1>
              ${
        this.selectedEvent?.cohort
            ? `<span class="tld-cohort-badge">Cohort ${this.selectedEvent.cohort}</span>`
            : ""
    }
            </div>
            <div class="tld-stat-pills">
              <div class="tld-stat-pill">
                <span class="tld-stat-num">${this.teams.length}</span>
                <span class="tld-stat-label">${t("tl.teams")}</span>
              </div>
              <div class="tld-stat-pill">
                <span class="tld-stat-num">${this.teams.filter((t) => t.project).length}</span>
                <span class="tld-stat-label">${t("tl.withProject")}</span>
              </div>
              <div class="tld-stat-pill">
                <span class="tld-stat-num">${this.teams.reduce((sum, t) => sum + (t.members?.length ?? 0), 0)}</span>
                <span class="tld-stat-label">${t("tl.coders")}</span>
              </div>
            </div>

            <div class="w-100 tld-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                id="tldSearch"
                type="text"
                class="tld-search-input"
                placeholder="${t("tl.searchTeams")}"
                value="${this.searchQuery}" />
            </div>
          </div>

          ${this.isAdmin ? this._renderAdminEvalPanel() : ""}

        <!-- Grid -->
        <div class="tld-grid" id="tldGrid">
          ${this._renderGrid()}
        </div>
      </div>
    `;

    this._attachListHandlers();
  }

  _renderGrid() {
    if (this.isLoading) {
      return Array.from(
          { length: 6 },
          () => `<div class="tld-card tld-card-skeleton"></div>`,
      ).join("");
    }

    if (this.error) {
      return `<div class="tld-empty"><p>${this.error}</p></div>`;
    }

    const filtered = this._filtered();

    if (!filtered.length) {
      return `
        <div class="tld-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;opacity:.3;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>${t("tl.noTeamsFound")}</p>
        </div>
      `;
    }

    return filtered.map((team, i) => this._renderTeamCard(team, i)).join("");
  }

  _renderTeamCard(team, index) {
    const project = team.project;
    const members = team.members ?? [];
    const hasProject = !!project;
    const isSubmitted = !!project?.submitted_at;

    const deliverables = [
      project?.repo_url,
      project?.video_url,
      project?.preview_photo_url,
    ].filter(Boolean).length;

    const totalDeliverables = 3;
    const progress = hasProject
        ? Math.round((deliverables / totalDeliverables) * 100)
        : 0;

    const avatarsHtml = members
        .slice(0, 4)
        .map((m, i) =>
            m.github_avatar_url
                ? `<img src="${m.github_avatar_url}" alt="${m.name}" class="tld-avatar" style="z-index:${10 - i};">`
                : `<div class="tld-avatar tld-avatar-initial" style="z-index:${10 - i};">${m.name?.charAt(0) ?? "?"}</div>`,
        )
        .join("");

    const extraMembers =
        members.length > 4
            ? `<div class="tld-avatar tld-avatar-more">+${members.length - 4}</div>`
            : "";

    const statusDot = isSubmitted
        ? `<span class="tld-status-dot tld-dot-submitted" title=t("tl.submittedReview") ?? "Submitted — ready for review"></span>`
        : hasProject
            ? deliverables === totalDeliverables
                ? `<span class="tld-status-dot tld-dot-complete" title="${t("tl.allDeliverables") ?? "All deliverables submitted"}"></span>`
                : `<span class="tld-status-dot tld-dot-partial" title="${deliverables}/${totalDeliverables} deliverables"></span>`
            : `<span class="tld-status-dot tld-dot-none" title=t("tl.noProject")></span>`;

    // Button state — respecting 3 blocking rules from eval-status
    const evalStatus = team._evalStatus;
    const evalsClosed     = evalStatus?.evaluations_closed ?? false;
    const areaCapped      = evalStatus?.area_closed ?? false;
    const alreadyDoneArea = evalStatus?.already_submitted ?? team._alreadyEvaluated;

    let evalBtnContent, evalBtnDisabled, evalBtnClass, evalBtnTitle;

    if (!isSubmitted && hasProject) {
      // Project exists but not submitted yet
      evalBtnContent  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${t("tl.notSubmitted")}`;
      evalBtnDisabled = "disabled";
      evalBtnClass    = "tld-eval-btn";
      evalBtnTitle    = "";
    } else if (!hasProject) {
      evalBtnContent  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${t("tl.noProject")}`;
      evalBtnDisabled = "disabled";
      evalBtnClass    = "tld-eval-btn";
      evalBtnTitle    = "";
    } else if (evalsClosed) {
      evalBtnContent  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> ${t("tl.evalsClosed") || "Calificaciones cerradas"}`;
      evalBtnDisabled = "disabled";
      evalBtnClass    = "tld-eval-btn tld-eval-btn--locked";
      evalBtnTitle    = t("tl.evalsClosedHint") || "El admin cerró las calificaciones";
    } else if (alreadyDoneArea) {
      // Already submitted — show review mode
      evalBtnContent  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${t("team.reviewEval")}`;
      evalBtnDisabled = "";
      evalBtnClass    = "tld-eval-btn tld-eval-btn--reviewed";
      evalBtnTitle    = "";
    } else if (areaCapped) {
      const max = evalStatus?.max_evaluators ?? 3;
      evalBtnContent  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg> ${t("tl.areaFull") || "Área completa"}`;
      evalBtnDisabled = "disabled";
      evalBtnClass    = "tld-eval-btn tld-eval-btn--locked";
      evalBtnTitle    = `${t("tl.areaFullHint") || "Ya hay"} ${evalStatus?.evaluator_count ?? max}/${max} ${t("tl.evaluators") || "calificadores"}`;
    } else {
      // Can evaluate
      evalBtnContent  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> ${t("team.evaluate")}`;
      evalBtnDisabled = "";
      evalBtnClass    = "tld-eval-btn tld-eval-btn--ready";
      evalBtnTitle    = "";
    }

    return `
      <article class="tld-card${isSubmitted ? " tld-card--submitted" : ""}" data-team-id="${team.id_team}" style="animation-delay:${index * 40}ms">
          <div class="tld-card-top">
          <div class="tld-card-name-row">
            ${statusDot}
            <h3 class="tld-card-team-name">${team.name}</h3>
            ${isSubmitted ? `<span class="tld-submitted-badge">${t("tl.ready")}</span>` : ""}
          </div>
          <div class="tld-card-project-name">
            ${hasProject ? project.name : `<span style="opacity:.45;font-style:italic;">${t("tl.noProject")}</span>`}
          </div>
        </div>

        ${
        hasProject
            ? `
          <div class="tld-progress-wrap">
            <div class="tld-progress-bar">
              <div class="tld-progress-fill${isSubmitted ? " tld-progress-fill--submitted" : ""}" style="width:${progress}%"></div>
            </div>
            <span class="tld-progress-label">${isSubmitted ? (t("tl.submittedReview") ?? "Submitted for review") : `${deliverables}/${totalDeliverables} deliverables`}</span>
          </div>
        `
            : `<div class="tld-progress-wrap"><div class="tld-progress-bar"><div class="tld-progress-fill" style="width:0%"></div></div><span class="tld-progress-label">${t("tl.noDeliverables")}</span></div>`
    }

        <div class="tld-card-members">
          <div class="tld-avatars-row">
            ${avatarsHtml}${extraMembers}
          </div>
          <span class="tld-member-count">${members.length} ${t("tl.membersCount")}</span>
        </div>

        <button
          class="${evalBtnClass}"
          data-team-id="${team.id_team}"
          ${evalBtnDisabled}
          ${evalBtnTitle ? `title="${evalBtnTitle}"` : ""}>
          ${evalBtnContent}
        </button>
      </article>
    `;
  }

  _renderDetail(team) {
    const content = document.getElementById("tl-content");
    if (!content) return;

    // Track which team is open so onLangChange can re-render the right view
    this.detailTeam = team;

    const isTL = TL_ROLES.includes(this.user?.role);
    const eventId = team.id_event ?? this.selectedEvent?.id ?? null;
    const projectId = team.project?.id_project ?? null;

    // Update breadcrumbs for detail view
    this.header.mountBreadcrumb([
      { label: t("nav.events"), route: "coderEventSelect" },
      {
        label: this.selectedEvent?.title ?? t("tl.teams"),
        route: "tlDashboard",
      },
      { label: team.name, route: null },
    ]);

    content.innerHTML = renderCoderTeam({
      user: this.user,
      team,
      isLeader: false,
      isTL,
    });

    setTimeout(() => {
      loadProjectBrief();
      if (projectId) {
        if (this.commentsCleanup) this.commentsCleanup();
        this.commentsCleanup = loadComments(projectId, this.user);
      }
      if (projectId && eventId && isTL) {
        loadEvaluationPanel({
          projectId,
          eventId,
          members: team.members ?? [],
          userRole: this.user?.role ?? null,
        });
      }
    }, 0);

    // Hide coder-only buttons that don't make sense for a TL viewer
    setTimeout(() => {
      document.getElementById("leaveTeamBtn")?.remove();
      document.getElementById("addMemberBtn")?.remove();
      document.querySelector(".btn-project-settings")?.remove();
    }, 0);
  }

  // ── Admin eval close/reopen panel ─────────────────────────────────────────
  _renderAdminEvalPanel() {
    const cv = this.evalCoverage;
    if (!cv) return "";

    const isClosed   = cv.evaluations_closed;
    const canClose   = cv.canClose;
    const missing    = cv.missing ?? [];

    if (isClosed) {
      return `
        <div class="tld-eval-admin-panel tld-eval-admin-panel--closed">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <span class="material-icons-round" style="color:#dc2626;font-size:1.2rem;">lock</span>
            <div class="flex-grow-1">
              <strong style="color:#dc2626;">${t("tl.evalsClosedBadge") || "Calificaciones cerradas"}</strong>
              <p class="mb-0 small text-muted">${t("tl.evalsClosedDesc") || "Los TLs ya no pueden enviar calificaciones."}</p>
            </div>
            <button id="btnReopenEvals" class="btn btn-sm btn-outline-danger" style="white-space:nowrap;">
              <span class="material-icons-round" style="font-size:.9rem;vertical-align:middle;">lock_open</span>
              ${t("tl.reopenEvals") || "Reabrir calificaciones"}
            </button>
          </div>
        </div>
      `;
    }

    const missingHtml = missing.length > 0
        ? `<ul class="mb-0 ps-3 mt-2" style="font-size:0.78rem;color:var(--text-muted);">
          ${missing.slice(0, 5).map(m =>
            `<li><strong>${m.projectName}</strong>: ${m.missingAreas.join(", ")}</li>`
        ).join("")}
          ${missing.length > 5 ? `<li>...y ${missing.length - 5} más</li>` : ""}
        </ul>`
        : "";

    const warningHtml = !canClose && missing.length > 0
        ? `<p class="mb-0 small mt-1" style="color:#92400e;">
          <span class="material-icons-round" style="font-size:.85rem;vertical-align:middle;">warning</span>
          ${t("tl.closeWarning") || "Al cerrar, los proyectos sin cobertura completa se calificarán solo con las evaluaciones existentes."}
        </p>`
        : "";

    return `
      <div class="tld-eval-admin-panel${canClose ? " tld-eval-admin-panel--ready" : " tld-eval-admin-panel--warn"}">
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <span class="material-icons-round" style="color:${canClose ? "#10b981" : "#f59e0b"};font-size:1.2rem;">
            ${canClose ? "check_circle" : "pending"}
          </span>
          <div class="flex-grow-1">
            <strong>${canClose
        ? (t("tl.allEvalsComplete") || "Todas las áreas calificadas — listo para cerrar")
        : (t("tl.evalsPending") || `${missing.length} proyecto(s) sin calificación completa`)
    }</strong>
            ${missingHtml}
            ${warningHtml}
          </div>
          <button id="btnCloseEvals"
                  class="btn btn-sm btn-danger"
                  data-has-missing="${missing.length > 0}"
                  data-missing-count="${missing.length}"
                  style="white-space:nowrap;">
            <span class="material-icons-round" style="font-size:.9rem;vertical-align:middle;">lock</span>
            ${t("tl.closeEvals") || "Cerrar calificaciones"}
          </button>
        </div>
      </div>
    `;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  _filtered() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.teams;
    return this.teams.filter(
        (t) =>
            t.name?.toLowerCase().includes(q) ||
            t.project?.name?.toLowerCase().includes(q),
    );
  }

  _roleLabel() {
    const map = {
      TL_DEVELOPMENT: t("tl.areaDev") ?? "Development",
      TL_SOFT_SKILLS: t("tl.areaSoft") ?? "Soft Skills",
      TL_ENGLISH: t("tl.areaEnglish") ?? "English",
      ADMIN: t("tl.areaAdmin") ?? "Admin",
    };
    return map[this.user?.role] ?? t("tl.teamLead") ?? "Team Lead";
  }

  // ── Event handlers ────────────────────────────────────────────────────────
  _attachListHandlers() {
    const searchInput = document.getElementById("tldSearch");
    if (searchInput) {
      searchInput.value = this.searchQuery;
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        const grid = document.getElementById("tldGrid");
        if (grid) grid.innerHTML = this._renderGrid();
        this._attachEvalBtnHandlers();
      });
    }

    // Admin: close evaluations
    document.getElementById("btnCloseEvals")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnCloseEvals");
      const hasMissing = btn.dataset.hasMissing === "true";
      const missingCount = parseInt(btn.dataset.missingCount ?? "0");

      let confirmMsg;
      if (hasMissing) {
        confirmMsg = `⚠️ ${missingCount} proyecto(s) no tienen todas las áreas calificadas.\n\nAl cerrar, se calculará la nota con las evaluaciones que existan.\n\n¿Deseas cerrar de todas formas?`;
      } else {
        confirmMsg = t("tl.closeEvalsConfirm") || "¿Cerrar las calificaciones? Los TLs ya no podrán enviar más evaluaciones.";
      }

      if (!confirm(confirmMsg)) return;

      const { closeEventEvaluations, getEventEvalCoverage } = await import("../services/api.js");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${t("common.loading") || "Procesando..."}`;
      try {
        await closeEventEvaluations(this.selectedEvent.id);
        this.evalCoverage = await getEventEvalCoverage(this.selectedEvent.id);
        toast.success(t("tl.evalsClosedBadge") || "Calificaciones cerradas", t("tl.evalsClosedDesc") || "Los TLs ya no pueden enviar calificaciones.");
        this._renderList();
        this._attachListHandlers();
      } catch (err) {
        toast.error(t("common.errorTitle"), err?.message ?? "No se pudo cerrar.");
        btn.disabled = false;
      }
    });

    // Admin: reopen evaluations
    document.getElementById("btnReopenEvals")?.addEventListener("click", async () => {
      const { reopenEventEvaluations, getEventEvalCoverage } = await import("../services/api.js");
      const btn = document.getElementById("btnReopenEvals");
      btn.disabled = true;
      btn.textContent = t("common.loading") || "Procesando...";
      try {
        await reopenEventEvaluations(this.selectedEvent.id);
        this.evalCoverage = await getEventEvalCoverage(this.selectedEvent.id);
        toast.success(t("tl.reopenEvals") || "Calificaciones reabiertas", "");
        this._renderList();
        this._attachListHandlers();
      } catch (err) {
        toast.error(t("common.errorTitle"), err?.message ?? "No se pudo reabrir.");
        btn.disabled = false;
      }
    });

    this._attachEvalBtnHandlers();
  }

  _attachEvalBtnHandlers() {
    document.querySelectorAll(".tld-eval-btn[data-team-id]").forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => {
        const teamId = parseInt(btn.dataset.teamId);
        const team = this.teams.find((t) => t.id_team === teamId);
        if (!team) return;
        this._renderDetail(team);
      });
    });
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
