import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";
import "../assets/styles/tldashboard.css";
import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { t, onLangChange } from "../utils/i18n.js";
import { apiFetch, getTeamEvalCounts } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import mainContent from "/pages/teams_dashboard.html?raw";
import {
  renderCoderTeam,
  loadProjectBrief,
  loadComments,
  loadEvaluationPanel,
} from "./coderTeam.js";

const TL_ROLES = ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "ADMIN"];
const MAX_PER_AREA = 3;
const ROLE_AREA_MAP = {
  TL_DEVELOPMENT: "DEVELOPMENT",
  TL_SOFT_SKILLS: "SOFT_SKILLS",
  TL_ENGLISH: "ENGLISH",
};
const AREA_LABELS = {
  DEVELOPMENT: "Dev",
  SOFT_SKILLS: "Soft",
  ENGLISH: "Eng",
};

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

    this.allTeams = [];
    this.teams = [];
    this.activeClans = new Set();
    this.searchQuery = "";
    this.currentView = "grid";
    this.isLoading = true;
    this.error = null;
    this.evalCoverage = null;
    this.isAdmin = this.user?.role === "ADMIN";
    // Map: id_team -> { DEVELOPMENT: count, SOFT_SKILLS: count, ENGLISH: count }
    this.teamAreaCounts = {};

    this.detailTeam = null;
    this.commentsCleanup = null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async init() {
    this.render();
    this.navbar.attachEventHandlers();
    await this._loadTeams();
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  async _loadTeams() {
    if (!this.selectedEvent?.id) {
      this.error = t("tl.noEventSelected");
      toast.error(t("common.errorTitle"), this.error);
      this.isLoading = false;
      this._paintGrid();
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
        getMyEvaluationsForProject,
      } = await import("../services/api.js");

      // Fetch per-area evaluator counts for the whole event at once
      try {
        const counts = await getTeamEvalCounts(this.selectedEvent.id);
        // counts: [{ id_team, team_name, areas: { DEVELOPMENT: N, SOFT_SKILLS: N, ENGLISH: N } }]
        counts.forEach((row) => {
          this.teamAreaCounts[row.id_team] = row.areas ?? {};
        });
      } catch (_) {}

      this.allTeams = await Promise.all(
          raw.map(async (team) => {
            try {
              const detail = await apiFetch(`/teams/${team.id_team}`, { method: "GET" });
              const full = detail?.data ?? detail;
              const projectId = full.project?.id_project ?? null;

              let _alreadyEvaluated = false;
              let _evalStatus = null;

              if (projectId) {
                try {
                  const [evals, evalStatus] = await Promise.all([
                    getMyEvaluationsForProject(projectId),
                    getProjectEvalStatus(projectId),
                  ]);
                  _alreadyEvaluated = Array.isArray(evals) && evals.length > 0;
                  _evalStatus = evalStatus;
                } catch (_) {}
              }

              return {
                ...team,
                members: full.members ?? [],
                project: full.project ?? null,
                preview_photo_url: full.project?.preview_photo_url ?? null,
                description: full.project?.description ?? team.description ?? "",
                _alreadyEvaluated,
                _evalStatus,
              };
            } catch {
              return { ...team, members: [], project: null, _alreadyEvaluated: false, _evalStatus: null };
            }
          }),
      );

      this.teams = [...this.allTeams];

      if (this.isAdmin && this.selectedEvent?.id) {
        try {
          this.evalCoverage = await getEventEvalCoverage(this.selectedEvent.id);
        } catch (_) {}
      }
    } catch (err) {
      this.error = t("tl.loadError");
      toast.error(t("common.errorTitle"), this.error);
    }

    this.isLoading = false;
    this.renderClanFilters(this.allTeams);
    this._applyFilters();
    this._attachHandlers();
    if (this.isAdmin) this._renderAdminEvalPanel();
  }

  // ── Shell ──────────────────────────────────────────────────────────────────

  render() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      ${this.navbar.render()}
      <div id="overlay" class="sidebar-overlay"></div>
      <div style="display:flex;flex-direction:column;width:100%">
        ${this.header.render()}
        <main class="dashboard-main">
          <div id="tl-admin-panel"></div>
          ${mainContent}
        </main>
      </div>
    `;

    this.header.mountBreadcrumb();
    this.header.attachEventHandlers();
    this._initAvatarTooltip();

    const teamsContainer = document.getElementById("teamsContainer");
    if (teamsContainer) {
      teamsContainer.innerHTML = `
        <div class="col-12">
          <div class="d-flex flex-column align-items-center justify-content-center" style="height:60vh;gap:16px;">
            <div class="ce-spinner" style="width:40px;height:40px;border-width:4px;border-color:rgba(107,92,255,0.2);border-top-color:var(--color-primary,#6b5cff);"></div>
            <p class="text-muted fw-medium">Loading Teams...</p>
          </div>
        </div>
      `;
    }

    if (!this._offLangChange) {
      this._offLangChange = onLangChange(() => {
        if (this.detailTeam) this._renderDetail(this.detailTeam);
        else this.render();
      });
    }
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  _applyFilters() {
    const query = this.searchQuery.toLowerCase().trim();
    let teams = this.allTeams;

    if (this.activeClans.size > 0) {
      teams = teams.filter((team) =>
          (team.members ?? []).some((m) => this.activeClans.has(m.clan))
      );
    }

    if (query) {
      teams = teams.filter((team) =>
          (team.name ?? "").toLowerCase().includes(query) ||
          (team.description ?? "").toLowerCase().includes(query) ||
          (team.project?.name ?? "").toLowerCase().includes(query) ||
          (team.members ?? []).some((m) => (m.name ?? "").toLowerCase().includes(query))
      );
    }

    this.teams = teams;
    if (this.currentView === "list") this._paintList();
    else this._paintGrid();
  }

  // ── Grid ───────────────────────────────────────────────────────────────────

  _paintGrid() {
    const container = document.getElementById("teamsContainer");
    if (!container || this.isLoading) return;

    if (this.error) {
      container.innerHTML = this._emptyHtml(`<span class="material-icons-round" style="font-size:3rem;color:var(--text-muted);">error_outline</span><p class="app-page-subtitle mb-0">${this.error}</p>`);
      return;
    }

    if (!this.teams.length) {
      container.innerHTML = this._emptyHtml(`<span class="material-icons-round" style="font-size:3rem;color:var(--text-muted);">group_off</span><p class="app-page-title mb-1" style="font-size:1rem;">${t("tl.noTeamsFound")}</p>`);
      return;
    }

    const fallbackImg = "https://lh3.googleusercontent.com/aida-public/AB6AXuBkiRe_OIFc5LnfH8E47l0JCD12t1WIUi-0jZCaj4pKMIED7WLD80FOkYpZMh9EzRCwKulfJkGWTtRHFykfSawQoMnQ0V9sOC2WXLAQecUyQFk6nn7oFqSBCWRIBTbouoiFMtC3phUERbubp7XZ-x5b59GrloQC5Eyts7NSudlzGFtFpX4FHJZ8QQR8klcHxzx2sBK6fpogWOMmlFNB9EChbZ_fMZ32SKMMd9h1u__l9dT5pU0a0mgPGH8qfoLKodNVNjpH1bFOOZk";
    container.innerHTML = "";

    this.teams.forEach((team) => {
      const members = team.members ?? [];
      const project = team.project;
      const hasProject = !!project;
      const isSubmitted = !!project?.submitted_at;
      const imgSrc = team.preview_photo_url || fallbackImg;

      const maxVisible = 5;
      const avatarsHtml = members.slice(0, maxVisible).map((m) =>
          m.github_avatar_url
              ? `<img src="${m.github_avatar_url}" alt="${m.name}" class="app-avatar app-avatar-has-tip ct-member-clickable" data-tip-name="${m.name}" data-user-id="${m.id_user}" style="cursor:pointer;">`
              : `<div class="app-avatar" style="background:var(--accent-dim);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:700;">${m.name?.charAt(0) ?? "?"}</div>`
      ).join("") + (members.length > maxVisible ? `<span class="app-avatar-more">+${members.length - maxVisible}</span>` : "");

      const submittedBadge = isSubmitted
          ? `<span style="font-size:0.7rem;background:rgba(90,204,164,0.12);color:#059669;border:1px solid rgba(90,204,164,0.3);padding:2px 8px;border-radius:20px;font-weight:700;">${t("tl.ready")}</span>`
          : "";

      container.insertAdjacentHTML("beforeend", `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="app-project-card">
            <div class="app-project-image">
              <img src="${imgSrc}" alt="Project image" class="img-fluid"
                   onerror="this.onerror=null;this.src='${fallbackImg}';" />
            </div>
            <div class="p-4 d-flex flex-column h-100">
              <div class="d-flex align-items-center gap-2 mb-1">
                <h5 class="app-card-title mb-0">${team.name}</h5>
                ${submittedBadge}
              </div>
              <p class="app-card-text text-break mb-2">${hasProject ? (project.name ?? "") : `<span style="opacity:.45;font-style:italic;">${t("tl.noProject")}</span>`}</p>
              ${this._renderAreaCounts(team)}
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="app-avatar-group">${avatarsHtml}</div>
                <span style="font-size:0.78rem;color:var(--text-muted);">${members.length} ${t("tl.membersCount")}</span>
              </div>
              ${this._buildEvalButton(team)}
            </div>
          </div>
        </div>
      `);
    });

    this._attachEvalBtnHandlers();
  }

  // ── List ───────────────────────────────────────────────────────────────────

  _paintList() {
    const container = document.getElementById("teamsContainer");
    if (!container || this.isLoading) return;

    if (!this.teams.length) {
      container.innerHTML = this._emptyHtml(`<span class="material-icons-round" style="font-size:3rem;color:var(--text-muted);">group_off</span><p class="app-page-title mb-1" style="font-size:1rem;">${t("tl.noTeamsFound")}</p>`);
      return;
    }

    container.innerHTML = `
      <div class="col-12 px-0">
        <div class="app-project-card-list p-3">
          <table class="table table-hover mb-0" style="width:100%;">
            <thead>
              <tr>
                <th style="width:22%;">${t("tl.teams")}</th>
                <th style="width:20%;">Project</th>
                <th style="width:18%;">Members</th>
                <th style="width:24%;">Area Grades</th>
                <th style="width:16%;"></th>
              </tr>
            </thead>
            <tbody id="tl-list-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = document.getElementById("tl-list-tbody");
    this.teams.forEach((team) => {
      const members = team.members ?? [];
      const project = team.project;
      const hasProject = !!project;
      const isSubmitted = !!project?.submitted_at;

      const membersAvatars = members.slice(0, 5).map((m) =>
          m.github_avatar_url
              ? `<img src="${m.github_avatar_url}" alt="${m.name}" class="app-avatar app-avatar-has-tip" data-tip-name="${m.name}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid #fff;cursor:default;">`
              : `<div class="app-avatar app-avatar-has-tip" data-tip-name="${m.name}" style="width:28px;height:28px;border-radius:50%;background:var(--accent-dim);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.75rem;border:2px solid #fff;cursor:default;">${m.name?.charAt(0) ?? "?"}</div>`
      ).join("") + (members.length > 5 ? `<span class="app-avatar-more" style="font-size:0.7rem;">+${members.length - 5}</span>` : "");

      const submittedBadge = isSubmitted
          ? `<span style="font-size:0.65rem;background:rgba(90,204,164,0.12);color:#059669;border:1px solid rgba(90,204,164,0.3);padding:1px 6px;border-radius:20px;font-weight:700;margin-left:4px;">${t("tl.ready")}</span>`
          : "";

      const evalBtn = this._buildEvalButton(team);

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td style="vertical-align:middle;">
            <strong style="font-size:0.88rem;">${team.name}</strong>${submittedBadge}
          </td>
          <td style="vertical-align:middle;font-size:0.82rem;color:var(--text-muted);">
            ${hasProject ? (project.name ?? "") : `<span style="opacity:.45;font-style:italic;">${t("tl.noProject")}</span>`}
          </td>
          <td style="vertical-align:middle;">
            <div class="app-avatar-group">${membersAvatars}</div>
          </td>
          <td style="vertical-align:middle;">${this._renderAreaCounts(team)}</td>
          <td style="vertical-align:middle;">${evalBtn}</td>
        </tr>
      `);
    });

    this._attachEvalBtnHandlers();
  }

  // ── Area counts badge row ──────────────────────────────────────────────────

  _renderAreaCounts(team) {
    const areas = this.teamAreaCounts[team.id_team] ?? {};
    const userArea = ROLE_AREA_MAP[this.user?.role] ?? null;

    const badges = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"].map((area) => {
      const count = areas[area] ?? 0;
      const isFull = count >= MAX_PER_AREA;
      const isUserArea = area === userArea;
      const label = AREA_LABELS[area];

      let bg, color, border;
      if (isFull) {
        bg = "rgba(90,204,164,0.12)"; color = "#059669"; border = "rgba(90,204,164,0.3)";
      } else if (isUserArea) {
        bg = "rgba(107,92,255,0.1)"; color = "var(--color-primary)"; border = "rgba(107,92,255,0.3)";
      } else {
        bg = "rgba(0,0,0,0.04)"; color = "var(--text-muted)"; border = "transparent";
      }

      return `<span style="font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:20px;background:${bg};color:${color};border:1px solid ${border};">${label} ${count}/${MAX_PER_AREA}</span>`;
    }).join("");

    return `<div class="d-flex gap-1 flex-wrap mb-2">${badges}</div>`;
  }

  // ── Eval button ────────────────────────────────────────────────────────────

  _buildEvalButton(team) {
    const project = team.project;
    const hasProject = !!project;
    const isSubmitted = !!project?.submitted_at;
    const evalStatus = team._evalStatus;
    const evalsClosed = evalStatus?.evaluations_closed ?? false;
    const alreadyDone = evalStatus?.already_submitted ?? team._alreadyEvaluated;

    // Use teamAreaCounts for area cap check (more accurate than _evalStatus.area_closed)
    const userArea = ROLE_AREA_MAP[this.user?.role] ?? null;
    const areaCount = userArea ? (this.teamAreaCounts[team.id_team]?.[userArea] ?? 0) : 0;
    const areaCapped = userArea ? areaCount >= MAX_PER_AREA : false;

    let content, disabled, cls, title;

    if (!hasProject) {
      content = `<span class="material-icons-round" style="font-size:14px;vertical-align:middle;">info</span> ${t("tl.noProject")}`;
      disabled = "disabled"; cls = "tld-eval-btn"; title = "";
    } else if (!isSubmitted) {
      content = `<span class="material-icons-round" style="font-size:14px;vertical-align:middle;">hourglass_empty</span> ${t("tl.notSubmitted")}`;
      disabled = "disabled"; cls = "tld-eval-btn"; title = "";
    } else if (evalsClosed) {
      content = `<span class="material-icons-round" style="font-size:14px;vertical-align:middle;">lock</span> ${t("tl.evalsClosed") || "Evaluations closed"}`;
      disabled = "disabled"; cls = "tld-eval-btn tld-eval-btn--locked"; title = t("tl.evalsClosedHint") || "";
    } else if (alreadyDone) {
      content = `<span class="material-icons-round" style="font-size:14px;vertical-align:middle;">visibility</span> ${t("team.reviewEval")}`;
      disabled = ""; cls = "tld-eval-btn tld-eval-btn--reviewed"; title = "";
    } else if (areaCapped && !this.isAdmin) {
      content = `<span class="material-icons-round" style="font-size:14px;vertical-align:middle;">group_off</span> ${t("tl.areaFull") || "Area full"}`;
      disabled = "disabled"; cls = "tld-eval-btn tld-eval-btn--locked";
      title = `${areaCount}/${MAX_PER_AREA} ${t("tl.evaluators") || "evaluators"}`;
    } else {
      content = `<span class="material-icons-round" style="font-size:14px;vertical-align:middle;">rate_review</span> ${t("team.evaluate")}`;
      disabled = ""; cls = "tld-eval-btn tld-eval-btn--ready"; title = "";
    }

    return `<button class="${cls}" data-team-id="${team.id_team}" ${disabled} ${title ? `title="${title}"` : ""}>${content}</button>`;
  }

  // ── Clan filters ───────────────────────────────────────────────────────────

  renderClanFilters(teams) {
    const container = document.getElementById("clanFiltersContainer");
    if (!container) return;

    const clansSet = new Set();
    teams.forEach((team) => {
      (team.members ?? []).forEach((m) => { if (m.clan) clansSet.add(m.clan); });
    });
    const clans = [...clansSet].sort();

    container.innerHTML = `
      <button class="app-filter-btn active" data-clan="ALL">Todos</button>
      ${clans.map((clan) => `
        <button class="app-filter-btn" data-clan="${clan}">
          <span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:#6c5cff;flex-shrink:0;margin-right:4px;"></span>
          ${clan}
        </button>
      `).join("")}
    `;

    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-clan]");
      if (!btn) return;
      const clan = btn.dataset.clan;
      if (clan === "ALL") {
        this.activeClans.clear();
        container.querySelectorAll(".app-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      } else {
        container.querySelector("[data-clan='ALL']")?.classList.remove("active");
        if (this.activeClans.has(clan)) { this.activeClans.delete(clan); btn.classList.remove("active"); }
        else { this.activeClans.add(clan); btn.classList.add("active"); }
        if (this.activeClans.size === 0) container.querySelector("[data-clan='ALL']")?.classList.add("active");
      }
      this._applyFilters();
    });
  }

  // ── Admin panel ────────────────────────────────────────────────────────────

  _renderAdminEvalPanel() {
    const panel = document.getElementById("tl-admin-panel");
    if (!panel || !this.evalCoverage) return;

    const cv = this.evalCoverage;
    const isClosed = cv.evaluations_closed;
    const canClose = cv.canClose;
    const missing = cv.missing ?? [];

    if (isClosed) {
      panel.innerHTML = `
        <div class="tld-eval-admin-panel tld-eval-admin-panel--closed mx-3 mt-3">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <span class="material-icons-round" style="color:#dc2626;font-size:1.2rem;">lock</span>
            <div class="flex-grow-1">
              <strong style="color:#dc2626;">${t("tl.evalsClosedBadge") || "Evaluations closed"}</strong>
              <p class="mb-0 small text-muted">${t("tl.evalsClosedDesc") || "TLs can no longer submit evaluations."}</p>
            </div>
            <button id="btnReopenEvals" class="btn btn-sm btn-outline-danger" style="white-space:nowrap;">
              <span class="material-icons-round" style="font-size:.9rem;vertical-align:middle;">lock_open</span>
              ${t("tl.reopenEvals") || "Reopen evaluations"}
            </button>
          </div>
        </div>`;
    } else {
      const missingHtml = missing.length > 0
          ? `<ul class="mb-0 ps-3 mt-2" style="font-size:0.78rem;color:var(--text-muted);">
            ${missing.slice(0, 5).map((m) => `<li><strong>${m.projectName}</strong>: ${m.missingAreas.join(", ")}</li>`).join("")}
            ${missing.length > 5 ? `<li>...and ${missing.length - 5} more</li>` : ""}
          </ul>` : "";

      panel.innerHTML = `
        <div class="tld-eval-admin-panel${canClose ? " tld-eval-admin-panel--ready" : " tld-eval-admin-panel--warn"} mx-3 mt-3">
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <span class="material-icons-round" style="color:${canClose ? "#10b981" : "#f59e0b"};font-size:1.2rem;">${canClose ? "check_circle" : "pending"}</span>
            <div class="flex-grow-1">
              <strong>${canClose ? (t("tl.allEvalsComplete") || "All areas graded") : (t("tl.evalsPending") || `${missing.length} project(s) missing evaluations`)}</strong>
              ${missingHtml}
            </div>
            <button id="btnCloseEvals" class="btn btn-sm btn-danger"
                    data-has-missing="${missing.length > 0}" data-missing-count="${missing.length}"
                    style="white-space:nowrap;">
              <span class="material-icons-round" style="font-size:.9rem;vertical-align:middle;">lock</span>
              ${t("tl.closeEvals") || "Close evaluations"}
            </button>
          </div>
        </div>`;
    }

    this._attachAdminPanelHandlers();
  }

  _attachAdminPanelHandlers() {
    document.getElementById("btnCloseEvals")?.addEventListener("click", async () => {
      const btn = document.getElementById("btnCloseEvals");
      const hasMissing = btn.dataset.hasMissing === "true";
      const missingCount = parseInt(btn.dataset.missingCount ?? "0");
      const msg = hasMissing
          ? `⚠️ ${missingCount} project(s) missing evaluations.\n\nClose anyway?`
          : t("tl.closeEvalsConfirm") || "Close evaluations?";
      if (!confirm(msg)) return;
      const { closeEventEvaluations, getEventEvalCoverage } = await import("../services/api.js");
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${t("common.loading") || "Processing..."}`;
      try {
        await closeEventEvaluations(this.selectedEvent.id);
        this.evalCoverage = await getEventEvalCoverage(this.selectedEvent.id);
        toast.success(t("tl.evalsClosedBadge") || "Evaluations closed", "");
        this._renderAdminEvalPanel();
      } catch (err) {
        toast.error(t("common.errorTitle"), err?.message ?? "Error");
        btn.disabled = false;
      }
    });

    document.getElementById("btnReopenEvals")?.addEventListener("click", async () => {
      const { reopenEventEvaluations, getEventEvalCoverage } = await import("../services/api.js");
      const btn = document.getElementById("btnReopenEvals");
      btn.disabled = true;
      btn.textContent = t("common.loading") || "Processing...";
      try {
        await reopenEventEvaluations(this.selectedEvent.id);
        this.evalCoverage = await getEventEvalCoverage(this.selectedEvent.id);
        toast.success(t("tl.reopenEvals") || "Evaluations reopened", "");
        this._renderAdminEvalPanel();
      } catch (err) {
        toast.error(t("common.errorTitle"), err?.message ?? "Error");
        btn.disabled = false;
      }
    });
  }

  // ── Detail view ────────────────────────────────────────────────────────────

  _renderDetail(team) {
    const app = document.getElementById("app");
    if (!app) return;

    this.detailTeam = team;
    const isTL = TL_ROLES.includes(this.user?.role);
    const eventId = team.id_event ?? this.selectedEvent?.id ?? null;
    const projectId = team.project?.id_project ?? null;

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

    this.navbar.attachEventHandlers();
    this.header.mountBreadcrumb([
      { label: t("nav.events"), route: "coderEventSelect" },
      { label: this.selectedEvent?.title ?? t("tl.teams"), route: "tlDashboard" },
      { label: team.name, route: null },
    ]);
    this.header.attachEventHandlers();

    document.getElementById("tl-content").innerHTML = renderCoderTeam({
      user: this.user, team, isLeader: false, isTL,
    });

    setTimeout(() => {
      loadProjectBrief();
      if (projectId) {
        if (this.commentsCleanup) this.commentsCleanup();
        this.commentsCleanup = loadComments(projectId, this.user);
        import("./coderTeam.js").then(({ loadMemberGrades }) => loadMemberGrades(projectId, { members: team.members }));
      }
      if (projectId && eventId && isTL) {
        loadEvaluationPanel({ projectId, eventId, members: team.members ?? [], userRole: this.user?.role ?? null });
      }
      document.getElementById("leaveTeamBtn")?.remove();
      document.getElementById("addMemberBtn")?.remove();
      document.querySelector(".btn-project-settings")?.remove();
    }, 0);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  _attachHandlers() {
    // Search
    const searchInput = document.getElementById("teamsSearchInput");
    if (searchInput) {
      searchInput.value = this.searchQuery;
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this._applyFilters();
      });
    }
    document.getElementById("teamsSearchBtn")?.addEventListener("click", () => this._applyFilters());

    // Grid/list toggle
    const gridBtn = document.getElementById("grid-view-btn");
    const listBtn = document.getElementById("list-view-btn");

    gridBtn?.addEventListener("click", () => {
      this.currentView = "grid";
      gridBtn.classList.add("active");
      listBtn?.classList.remove("active");
      this._paintGrid();
    });

    listBtn?.addEventListener("click", () => {
      this.currentView = "list";
      listBtn.classList.add("active");
      gridBtn?.classList.remove("active");
      this._paintList();
    });

    this._attachEvalBtnHandlers();
  }

  _attachEvalBtnHandlers() {
    document.querySelectorAll(".tld-eval-btn[data-team-id]:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const teamId = parseInt(btn.dataset.teamId);
        const team = this.allTeams.find((t) => t.id_team === teamId);
        if (team) this._renderDetail(team);
      });
    });
  }

  // ── Utils ──────────────────────────────────────────────────────────────────

  _emptyHtml(inner) {
    return `<div class="col-12"><div class="app-project-card d-flex flex-column align-items-center justify-content-center py-5 gap-3 text-center">${inner}</div></div>`;
  }

  _initAvatarTooltip() {
    if (document.getElementById("app-avatar-tip")) return;

    const tip = document.createElement("span");
    tip.id = "app-avatar-tip";
    document.body.appendChild(tip);

    this._avatarMouseOver = (e) => {
      const img = e.target.closest(".app-avatar-has-tip");
      if (!img) return;
      tip.textContent = img.dataset.tipName;
      tip.classList.add("visible");
      const rect = img.getBoundingClientRect();
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

  destroy() {
    if (this._offLangChange) this._offLangChange();
    if (this._avatarMouseOver) document.removeEventListener("mouseover", this._avatarMouseOver);
    if (this._avatarMouseOut) document.removeEventListener("mouseout", this._avatarMouseOut);
    const tip = document.getElementById("app-avatar-tip");
    if (tip) tip.remove();
  }
}
