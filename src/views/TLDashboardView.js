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
      } catch (_) {}
    }

    this.teams = [];
    this.isLoading = true;
    this.error = null;
    this.searchQuery = "";

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

      // Enrich each team with project + member count
      this.teams = await Promise.all(
        raw.map(async (t) => {
          try {
            const detail = await apiFetch(`/teams/${t.id_team}`, {
              method: "GET",
            });
            const full = detail?.data ?? detail;

            // Check if this TL already evaluated this team's project
            let _alreadyEvaluated = false;
            const projectId = full.project?.id_project ?? null;
            if (projectId) {
              try {
                const { getMyEvaluationsForProject } =
                  await import("../services/api.js");
                const evals = await getMyEvaluationsForProject(projectId);
                _alreadyEvaluated = Array.isArray(evals) && evals.length > 0;
              } catch (_) {}
            }

            return {
              ...t,
              members: full.members ?? [],
              project: full.project ?? null,
              _alreadyEvaluated,
            };
          } catch {
            return {
              ...t,
              members: [],
              project: null,
              _alreadyEvaluated: false,
            };
          }
        }),
      );
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
      <div style="display:flex;flex-direction:column;width:100%">
        ${this.header.render()}
        <main class="coder-home-main flex-grow-1">
          <div id="tl-content"></div>
        </main>
      </div>
    `;

    this.navbar.attachEventHandlers();
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

            <div class="tld-search-wrap">
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

    // Button state
    let evalBtnContent, evalBtnDisabled, evalBtnClass;
    if (isSubmitted && team._alreadyEvaluated) {
      evalBtnContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${t("team.reviewEval")}`;
      evalBtnDisabled = "";
      evalBtnClass = "tld-eval-btn tld-eval-btn--reviewed";
    } else if (isSubmitted) {
      evalBtnContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> ${t("team.evaluate")}`;
      evalBtnDisabled = "";
      evalBtnClass = "tld-eval-btn tld-eval-btn--ready";
    } else if (hasProject) {
      evalBtnContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${t("tl.notSubmitted")}`;
      evalBtnDisabled = "disabled";
      evalBtnClass = "tld-eval-btn";
    } else {
      evalBtnContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${t("tl.noProject")}`;
      evalBtnDisabled = "disabled";
      evalBtnClass = "tld-eval-btn";
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
          ${evalBtnDisabled}>
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
