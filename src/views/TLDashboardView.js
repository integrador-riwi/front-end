//import "../assets/styles/coderHome.css";
//import "../assets/styles/coderTeam.css";
import "../assets/styles/tldashboard.css";
import Navbar from "../components/navbar/navbar.js";
import { getUser } from "../utils/auth.js";
import { t } from "../utils/i18n.js";
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
      this.error = "No event selected."; // t("tl.noEventSelected");
      toast.error("Error", this.error);
      this.isLoading = false;
      this._renderList();
      return;
    }

    try {
      const res = await apiFetch(
        `/teams?idEvent=${this.selectedEvent.id}&limit=100`,
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
            return {
              ...t,
              members: full.members ?? [],
              project: full.project ?? null,
            };
          } catch {
            return { ...t, members: [], project: null };
          }
        }),
      );
    } catch (err) {
      this.error = t("tl.loadError") ?? "Could not load teams.";
      toast.error("Error", this.error);
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
      <div class="layout">
        ${this.navbar.render()}
        <main class="coder-home-main flex-grow-1">
          <div id="tl-content"></div>
        </main>
      </div>
    `;

    this.navbar.attachEventHandlers();
    this._renderList();
  }

  // ── Teams list ─────────────────────────────────────────────────────────────
  _renderList() {
    const content = document.getElementById("tl-content");
    if (!content) return;

    content.innerHTML = `
      <div class="tld-page">

        <!-- Header -->
        <header class="tld-header">
          ${
            this.selectedEvent
              ? `<button class="tld-back-btn" id="tldBackBtn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                  Back to events
                </button>`
              : ""
          }
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
                <span class="tld-stat-label">Teams</span>
              </div>
              <div class="tld-stat-pill">
                <span class="tld-stat-num">${this.teams.filter((t) => t.project).length}</span>
                <span class="tld-stat-label">With Project</span>
              </div>
              <div class="tld-stat-pill">
                <span class="tld-stat-num">${this.teams.reduce((sum, t) => sum + (t.members?.length ?? 0), 0)}</span>
                <span class="tld-stat-label">Coders</span>
              </div>
            </div>
          </div>

          <!-- Search -->
          <div class="tld-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="tldSearch"
              type="text"
              class="tld-search-input"
              placeholder="Search teams or projects…"
              value="${this.searchQuery}" />
          </div>
        </header>

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
          <p>No teams found.</p>
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
    if (isSubmitted) {
      evalBtnContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Evaluate`;
      evalBtnDisabled = "";
      evalBtnClass = "tld-eval-btn tld-eval-btn--ready";
    } else if (hasProject) {
      evalBtnContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Not submitted yet`;
      evalBtnDisabled = "disabled";
      evalBtnClass = "tld-eval-btn";
    } else {
      evalBtnContent = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> No project`;
      evalBtnDisabled = "disabled";
      evalBtnClass = "tld-eval-btn";
    }

    return `
      <article class="tld-card${isSubmitted ? " tld-card--submitted" : ""}" data-team-id="${team.id_team}" style="animation-delay:${index * 40}ms">
        <div class="tld-card-top">
          <div class="tld-card-name-row">
            ${statusDot}
            <h3 class="tld-card-team-name">${team.name}</h3>
            ${isSubmitted ? `<span class="tld-submitted-badge">Ready</span>` : ""}
          </div>
          <div class="tld-card-project-name">
            ${hasProject ? project.name : '<span style="opacity:.45;font-style:italic;">No project yet</span>'}
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
            : `<div class="tld-progress-wrap"><div class="tld-progress-bar"><div class="tld-progress-fill" style="width:0%"></div></div><span class="tld-progress-label">No deliverables</span></div>`
        }

        <div class="tld-card-members">
          <div class="tld-avatars-row">
            ${avatarsHtml}${extraMembers}
          </div>
          <span class="tld-member-count">${members.length} member${members.length !== 1 ? "s" : ""}</span>
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

  // ── Detail view (coderTeam template reused) ───────────────────────────────
  _renderDetail(team) {
    const content = document.getElementById("tl-content");
    if (!content) return;

    const isTL = TL_ROLES.includes(this.user?.role);
    const eventId = team.id_event ?? this.selectedEvent?.id ?? null;
    const projectId = team.project?.id_project ?? null;

    content.innerHTML = `
      <div class="tld-detail-back-bar">
        <button class="tld-back-btn" id="tldDetailBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to ${this.selectedEvent?.title ?? "teams"}
        </button>
      </div>
      ${renderCoderTeam({ user: this.user, team, isLeader: false, isTL })}
    `;

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

    document.getElementById("tldDetailBack")?.addEventListener("click", () => {
      this._renderList();
      this._attachListHandlers();
    });

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
    document.getElementById("tldBackBtn")?.addEventListener("click", () => {
      this.router.navigate("coderEventSelect");
    });

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
}
