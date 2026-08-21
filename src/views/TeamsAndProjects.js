import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser, clearSession } from "../utils/auth.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";
import { apiFetch, closeTeam, searchProjectsSemantic } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import mainContent from "/pages/teams_dashboard.html?raw";
import { getTeamsByEvent } from "../services/api.js";
import { getSelectedEvent } from "../utils/helpers.js";

export default class Teams {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.eventId = getSelectedEvent();
    this.isAdmin = this.user?.role === "ADMIN";
    this.allTeams = [];
    this.activeClans = new Set();
    this.searchQuery = "";
    this.currentView = "grid"; // "grid" | "list"
    this._semanticMode = false; // admin-only toggle
    this.teamAreaCounts = {}; // id_team -> { DEVELOPMENT: N, SOFT_SKILLS: N, ENGLISH: N }
  }

  renderAvatars(users) {
    const maxVisible = 5;
    const container = document.createElement("div");
    container.className = "app-avatar-group";

    users.slice(0, maxVisible).forEach((user) => {
      const img = document.createElement("img");
      img.src = user.github_avatar_url;
      img.alt = user.name;
      img.className = "app-avatar app-avatar-has-tip ct-member-clickable";
      img.dataset.tipName = user.name;
      img.dataset.userId = user.id_user;
      img.style.cursor = "pointer";
      container.appendChild(img);
    });

    if (users.length > maxVisible) {
      const more = document.createElement("span");
      more.className = "app-avatar-more";
      more.textContent = `+${users.length - maxVisible}`;
      container.appendChild(more);
    }

    return container.outerHTML;
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

  showLoading(container) {
    container.innerHTML = `
    <div class="col-12">
      <div class="app-project-card d-flex flex-column align-items-center justify-content-center py-5 gap-3">
        <div class="spinner-border" role="status" style="width:2.5rem;height:2.5rem;color:var(--color-primary);">
          <span class="visually-hidden">${t("common.loading")}</span>
        </div>
        <p class="app-page-subtitle mb-0" style="font-size:0.95rem;">${t("teamsProjects.loading")}</p>
      </div>
    </div>`;
  }

  showEmpty(container) {
    container.innerHTML = `
    <div class="col-12">
      <div class="app-project-card d-flex flex-column align-items-center justify-content-center py-5 gap-3 text-center">
        <span class="material-icons-round" style="font-size:3rem;color:var(--text-muted);">group_off</span>
        <div>
          <p class="app-page-title mb-1" style="font-size:1rem;">${t("teamsProjects.noTeams")}</p>
          <p class="app-page-subtitle mb-0" style="font-size:0.875rem;">${t("teamsProjects.noTeamsMsg")}</p>
        </div>
      </div>
    </div>`;
  }

  showError(container, err, onRetry) {
    const correlationId = err?.correlationId;
    const correlationHtml = correlationId
      ? `<div class="mt-1 text-muted font-monospace" style="font-size: 0.75rem;">ID de correlación: <code>${correlationId}</code></div>`
      : "";

    container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger d-flex flex-column align-items-center text-center p-4 rounded-3 shadow-sm">
        <span class="material-symbols-outlined mb-2" style="font-size: 2.5rem;">error</span>
        <h6 class="fw-bold mb-1">Error al cargar equipos y proyectos</h6>
        <p class="mb-2" style="font-size: 0.88rem;">${err?.message || "No se pudo obtener la lista de equipos."}</p>
        ${correlationHtml}
        ${onRetry ? `<button id="teams-retry-btn" class="btn btn-sm btn-outline-danger mt-2 px-3 fw-bold">Reintentar</button>` : ""}
      </div>
    </div>`;

    if (onRetry) {
      container.querySelector("#teams-retry-btn")?.addEventListener("click", onRetry);
    }
  }

  async render() {
    const app = document.getElementById("app");

    app.innerHTML = `
      ${this.navbar.render()}
      <div style="display: flex; flex-direction: column; width: 100%">
        ${this.header.render()}
        <main class="dashboard-main">
          ${mainContent}
        </main>
      </div>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();
    this._initAvatarTooltip();
    await this.renderTeamsGrid();
    this.attachEventHandlers();

    this._offLangChange = onLangChange(() => this.renderTeamsGrid());
  }

  async loadTeams() {
    try {
      const event = getSelectedEvent();

      if (!event) {
        console.warn("No selected event found");
        return;
      }

      this.teams = await getTeamsByEvent(event.id);
      await this.renderTeamsGrid();
    } catch (error) {
      console.error("Error loading teams:", error);
    }
  }

  async renderTeamsGrid() {
    this.currentView = "grid";
    this._gridListenersAttached = false;

    const teamsContainer = document.getElementById("teamsContainer");
    if (!teamsContainer) return;

    // Solo fetchear si aún no tenemos datos
    if (this.allTeams.length === 0) {
      this.showLoading(teamsContainer);

      try {
        const fetchTeams = await apiFetch(`/teams?idEvent=${this.eventId}&limit=50&includeSubmitted=true&includeClosed=true`, { method: "GET" });
        const totalTeams = fetchTeams.data.teams;

        if (!totalTeams || totalTeams.length === 0) {
          this.showEmpty(teamsContainer);
          this.renderClanFilters([]);
          return;
        }

        this.allTeams = totalTeams;
        this.renderClanFilters(totalTeams);

        // Admin: cargar contadores de calificaciones por área
        if (this.isAdmin && this.eventId) {
          try {
            const { getTeamEvalCounts } = await import("../services/api.js");
            const counts = await getTeamEvalCounts(this.eventId);
            counts.forEach((row) => {
              this.teamAreaCounts[row.id_team] = row.areas ?? {};
            });
          } catch (_) {}
        }
      } catch (err) {
        console.error("Error loading teams grid:", err);
        this.showError(teamsContainer, err, () => this.renderTeamsGrid());
        return;
      }
    }

    this._applyFilters();
  }

  _renderAreaCounts(team) {
    if (!this.isAdmin) return "";
    const areas = this.teamAreaCounts[team.id_team] ?? {};
    const LABELS = { DEVELOPMENT: "Dev", SOFT_SKILLS: "Soft", ENGLISH: "Eng" };
    const badges = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"].map((area) => {
      const count = areas[area] ?? 0;
      const hasCoverage = count > 0;
      const bg = hasCoverage ? "rgba(90,204,164,0.12)" : "rgba(0,0,0,0.04)";
      const color = hasCoverage ? "#059669" : "var(--text-muted)";
      const border = hasCoverage ? "rgba(90,204,164,0.3)" : "transparent";
      return `<span style="font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:20px;background:${bg};color:${color};border:1px solid ${border};">${LABELS[area]} ${count}</span>`;
    }).join("");
    return `<div class="d-flex gap-1" style="flex-wrap:nowrap;">${badges}</div>`;
  }

  _paintTeamsGrid(teams, container) {
    if (!container) container = document.getElementById("teamsContainer");
    if (!container) return;

    if (!teams || teams.length === 0) {
      this.showEmpty(container);
      return;
    }

    container.innerHTML = "";

    teams.forEach((team) => {
      const members = team.members ?? [];
      const membersIcons = this.renderAvatars(members);

      const clickableClass = this.isAdmin ? "td-clickable" : "";
      const dataAttr = this.isAdmin ? `data-team-id="${team.id_team}"` : "";
      const adminHint = this.isAdmin
          ? `title="${t("teamsProjects.viewDetail")}"`
          : "";

      const fallbackImg = "https://lh3.googleusercontent.com/aida-public/AB6AXuBkiRe_OIFc5LnfH8E47l0JCD12t1WIUi-0jZCaj4pKMIED7WLD80FOkYpZMh9EzRCwKulfJkGWTtRHFykfSawQoMnQ0V9sOC2WXLAQecUyQFk6nn7oFqSBCWRIBTbouoiFMtC3phUERbubp7XZ-x5b59GrloQC5Eyts7NSudlzGFtFpX4FHJZ8QQR8klcHxzx2sBK6fpogWOMmlFNB9EChbZ_fMZ32SKMMd9h1u__l9dT5pU0a0mgPGH8qfoLKodNVNjpH1bFOOZk";
      const imgSrc = team.preview_photo_url || fallbackImg;
      const isClosed = !!team.closed_at;
      const closedBadge = isClosed
        ? `<span style="font-size:0.68rem;background:rgba(239,68,68,0.09);color:#b91c1c;border:1px solid rgba(239,68,68,0.22);padding:2px 8px;border-radius:20px;font-weight:700;">Cerrado</span>`
        : "";
      const closeAction = this.isAdmin
        ? isClosed
          ? `<span style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">No aparece en open</span>`
          : `<button class="td-close-team-btn" data-action="close-team" data-team-id="${team.id_team}" type="button" title="Cerrar equipo">
              <span class="material-icons-round" style="font-size:0.95rem;vertical-align:middle;">lock</span>
              Cerrar equipo
            </button>`
        : "";

      const card = `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="app-project-card ${clickableClass}"
               ${dataAttr}
               ${adminHint}
               role="${this.isAdmin ? "button" : ""}"
               tabindex="${this.isAdmin ? "0" : ""}">
            <div class="app-project-image">
              <img
                src="${imgSrc}"
                alt="Project image"
                class="img-fluid"
                onerror="this.onerror=null;this.src='${fallbackImg}';"
              />
            </div>
            <div class="p-4">
              <div class="d-flex align-items-center gap-2 mb-1">
                <h5 class="app-card-title mb-0">${team.name}</h5>
                ${closedBadge}
              </div>
              <p class="app-card-text text-break">${team.description ?? ""}</p>
              ${this._renderAreaCounts(team)}
              <div class="d-flex justify-content-between align-items-center mb-3 gap-2">
                <div class="app-avatar-group">
                  ${membersIcons}
                </div>
                <div class="d-flex align-items-center gap-2" style="flex-wrap:wrap;justify-content:flex-end;">
                  ${closeAction}
                  ${
          this.isAdmin
              ? `<span class="td-view-detail-hint">
                       <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;">open_in_new</span>
                       ${t("teamsProjects.viewDetail")}
                     </span>`
              : ""
      }
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      container.insertAdjacentHTML("beforeend", card);
    });

    // Delegación de eventos — solo ADMIN, solo se adjunta una vez
    if (this.isAdmin && !this._gridListenersAttached) {
      this._gridListenersAttached = true;

      container.addEventListener("click", (e) => {
        const closeBtn = e.target.closest("[data-action='close-team']");
        if (closeBtn) {
          e.preventDefault();
          e.stopPropagation();
          this._handleCloseTeam(closeBtn.dataset.teamId);
          return;
        }

        const card = e.target.closest("[data-team-id]");
        if (!card) return;
        this.router.navigate("teamDetail", { teamId: card.dataset.teamId });
      });

      container.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest("[data-team-id]");
        if (!card) return;
        e.preventDefault();
        this.router.navigate("teamDetail", { teamId: card.dataset.teamId });
      });
    }
  }

  renderClanFilters(teams) {
    const container = document.getElementById("clanFiltersContainer");
    if (!container) return;

    // Extraer clanes únicos de los miembros (campo clan ya viene en el response)
    const clansSet = new Set();
    teams.forEach((team) => {
      (team.members ?? []).forEach((member) => {
        if (member.clan) clansSet.add(member.clan);
      });
    });

    const clans = [...clansSet].sort();

    container.innerHTML = `
      <button class="app-filter-btn active" data-clan="ALL">Todos</button>
      ${clans.map((clan) => `
        <button class="app-filter-btn" data-clan="${clan}">
          <span class="app-clan-dot" style="width:8px;height:8px;border-radius:50%;display:inline-block;background:#6c5cff;flex-shrink:0;"></span>
          ${clan}
        </button>
      `).join("")}
    `;

    if (this._clanFilterHandler) {
      container.removeEventListener("click", this._clanFilterHandler);
    }

    this._clanFilterHandler = (e) => {
      const btn = e.target.closest("[data-clan]");
      if (!btn) return;

      const clan = btn.dataset.clan;

      if (clan === "ALL") {
        this.activeClans.clear();
        container.querySelectorAll(".app-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      } else {
        container.querySelector("[data-clan='ALL']")?.classList.remove("active");

        if (this.activeClans.has(clan)) {
          this.activeClans.delete(clan);
          btn.classList.remove("active");
        } else {
          this.activeClans.add(clan);
          btn.classList.add("active");
        }

        if (this.activeClans.size === 0) {
          container.querySelector("[data-clan='ALL']")?.classList.add("active");
        }
      }

      this._applyFilters();
    };

    container.addEventListener("click", this._clanFilterHandler);
  }

  _applyFilters() {
    const query = this.searchQuery.toLowerCase().trim();

    let teams = this.allTeams;

    // Filter by clan
    if (this.activeClans.size > 0) {
      teams = teams.filter((team) =>
          (team.members ?? []).some((member) => this.activeClans.has(member.clan))
      );
    }

    // Filter by text: team name, description, member name
    if (query) {
      teams = teams.filter((team) => {
        const matchName = (team.name ?? "").toLowerCase().includes(query);
        const matchDesc = (team.description ?? "").toLowerCase().includes(query);
        const matchMember = (team.members ?? []).some((m) =>
            (m.name ?? "").toLowerCase().includes(query)
        );
        return matchName || matchDesc || matchMember;
      });
    }

    if (this.currentView === "list") {
      this._paintTeamsList(teams);
    } else {
      this._paintTeamsGrid(teams);
    }
  }

  _paintSemanticResults(projects) {
    const container = document.getElementById("teamsContainer");
    if (!container) return;

    if (!projects || projects.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="app-project-card d-flex flex-column align-items-center justify-content-center py-5 gap-3 text-center">
            <span class="material-icons-round" style="font-size:3rem;color:var(--text-muted);">search_off</span>
            <div>
              <p class="app-page-title mb-1" style="font-size:1rem;">No results found</p>
              <p class="app-page-subtitle mb-0" style="font-size:0.875rem;">No projects matched your search.</p>
            </div>
          </div>
        </div>`;
      return;
    }

    const fallbackImg = "https://lh3.googleusercontent.com/aida-public/AB6AXuBkiRe_OIFc5LnfH8E47l0JCD12t1WIUi-0jZCaj4pKMIED7WLD80FOkYpZMh9EzRCwKulfJkGWTtRHFykfSawQoMnQ0V9sOC2WXLAQecUyQFk6nn7oFqSBCWRIBTbouoiFMtC3phUERbubp7XZ-x5b59GrloQC5Eyts7NSudlzGFtFpX4FHJZ8QQR8klcHxzx2sBK6fpogWOMmlFNB9EChbZ_fMZ32SKMMd9h1u__l9dT5pU0a0mgPGH8qfoLKodNVNjpH1bFOOZk";
    container.innerHTML = "";

    projects.forEach((p) => {
      const pct = p.similarity != null ? Math.round(p.similarity * 100) : null;
      const matchBadge = pct != null
          ? `<span class="sem-match-badge" style="font-size:0.7rem;background:rgba(107,92,255,0.1);color:var(--color-primary);border:1px solid rgba(107,92,255,0.25);padding:2px 8px;border-radius:20px;font-weight:700;">${pct}% match</span>`
          : "";

      const members = (p.members ?? []).filter((m) => m?.github_avatar_url);
      const membersIcons = this.renderAvatars(members);
      const imgSrc = p.preview_photo_url || fallbackImg;
      const fakeTeam = { id_team: p.id_team };

      container.insertAdjacentHTML("beforeend", `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="app-project-card td-clickable"
               data-team-id="${p.id_team}"
               title="${t("teamsProjects.viewDetail")}"
               role="button" tabindex="0">
            <div class="app-project-image">
              <img src="${imgSrc}" alt="Project image" class="img-fluid"
                   onerror="this.onerror=null;this.src='${fallbackImg}';" />
            </div>
            <div class="p-4">
              <div class="d-flex align-items-center gap-2 mb-1">
                <h5 class="app-card-title mb-0">${p.team_name ?? ""}</h5>
                ${matchBadge}
              </div>
              <p class="app-card-text text-break mb-2">${p.description ?? ""}</p>
              ${this._renderAreaCounts(fakeTeam)}
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="app-avatar-group">${membersIcons}</div>
                <span class="td-view-detail-hint">
                  <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;">open_in_new</span>
                  ${t("teamsProjects.viewDetail")}
                </span>
              </div>
            </div>
          </div>
        </div>
      `);
    });

    if (!this._gridListenersAttached) {
      this._gridListenersAttached = true;
      container.addEventListener("click", (e) => {
        const card = e.target.closest("[data-team-id]");
        if (!card) return;
        this.router.navigate("teamDetail", { teamId: card.dataset.teamId });
      });
      container.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest("[data-team-id]");
        if (!card) return;
        e.preventDefault();
        this.router.navigate("teamDetail", { teamId: card.dataset.teamId });
      });
    }
  }

  _paintSemanticResultsList(projects) {
    const container = document.getElementById("teamsContainer");
    if (!container) return;

    if (!projects || projects.length === 0) {
      this.showEmpty(container);
      return;
    }

    container.innerHTML = `
      <div class="col-12 px-0">
        <div class="app-project-card-list p-3">
          <table class="table table-hover mb-0" style="width:100%;">
            <thead>
              <tr>
                <th style="width:22%;">${t("teamsProjects.team")}</th>
                <th style="width:28%;">${t("teamsProjects.desc")}</th>
                <th style="width:10%;">Match</th>
                <th style="width:16%;">${t("teamsProjects.members")}</th>
                <th style="width:24%;">Area Grades</th>
              </tr>
            </thead>
            <tbody id="teamsTableBody"></tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = document.getElementById("teamsTableBody");

    projects.forEach((p) => {
      const pct = p.similarity != null ? Math.round(p.similarity * 100) : null;
      const matchBadge = pct != null
          ? `<span class="sem-match-badge" style="font-size:0.7rem;background:rgba(107,92,255,0.1);color:var(--color-primary);border:1px solid rgba(107,92,255,0.25);padding:2px 7px;border-radius:20px;font-weight:700;">${pct}%</span>`
          : "—";

      const members = (p.members ?? []).filter((m) => m?.github_avatar_url);
      const membersIcons = this.renderAvatars(members);
      const fakeTeam = { id_team: p.id_team };

      tbody.insertAdjacentHTML("beforeend", `
        <tr class="td-clickable" data-team-id="${p.id_team}"
            style="cursor:pointer;" title="${t("teamsProjects.viewDetail")}">
          <td style="vertical-align:middle;">
            <strong style="font-size:0.88rem;">${p.team_name ?? ""}</strong>
          </td>
          <td style="vertical-align:middle;font-size:0.82rem;color:var(--text-muted);">
            ${p.description ?? ""}
          </td>
          <td style="vertical-align:middle;">${matchBadge}</td>
          <td style="vertical-align:middle;">
            <div class="app-avatar-group">${membersIcons}</div>
          </td>
          <td style="vertical-align:middle;">${this._renderAreaCounts(fakeTeam)}</td>
        </tr>
      `);
    });

    if (!this._listListenersAttached) {
      this._listListenersAttached = true;
      container.addEventListener("click", (e) => {
        const row = e.target.closest("[data-team-id]");
        if (!row) return;
        this.router.navigate("teamDetail", { teamId: row.dataset.teamId });
      });
    }
  }

  async renderTeamsList() {
    this.currentView = "list";

    const teamsContainer = document.getElementById("teamsContainer");
    if (!teamsContainer) return;

    // Si aún no hay datos (caso borde), fetchear
    if (this.allTeams.length === 0) {
      this.showLoading(teamsContainer);

      const fetchTeams = await apiFetch(
          `/teams?limit=100${this.eventId ? `&idEvent=${this.eventId}` : ""}&includeSubmitted=true&includeClosed=true`,
          { method: "GET" },
      );
      const totalTeams = fetchTeams.data.teams;

      if (!totalTeams || totalTeams.length === 0) {
        this.showEmpty(teamsContainer);
        this.renderClanFilters([]);
        return;
      }

      this.allTeams = totalTeams;
      this.renderClanFilters(totalTeams);
    }

    this._applyFilters();
  }

  _paintTeamsList(teams) {
    const teamsContainer = document.getElementById("teamsContainer");
    if (!teamsContainer) return;

    if (!teams || teams.length === 0) {
      this.showEmpty(teamsContainer);
      return;
    }

    teamsContainer.innerHTML = `
      <div class="col-12 px-0">
        <div class="app-project-card-list p-3">
          <table class="table table-hover mb-0" style="width:100%;">
            <thead>
              <tr>
                <th style="width:24%;">${t("teamsProjects.team")}</th>
                <th style="width:30%;">${t("teamsProjects.desc")}</th>
                <th style="width:18%;">${t("teamsProjects.members")}</th>
                ${this.isAdmin ? `<th style="width:18%;">Area Grades</th><th style="width:10%;">Acción</th>` : ""}
              </tr>
            </thead>
            <tbody id="teamsTableBody"></tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = document.getElementById("teamsTableBody");

    teams.forEach((team) => {
      const members = team.members ?? [];
      const membersIcons = this.renderAvatars(members);
      const isClosed = !!team.closed_at;
      const closedBadge = isClosed
        ? `<span style="font-size:0.65rem;background:rgba(239,68,68,0.09);color:#b91c1c;border:1px solid rgba(239,68,68,0.22);padding:1px 6px;border-radius:20px;font-weight:700;margin-left:4px;">Cerrado</span>`
        : "";
      const actionCell = this.isAdmin
        ? isClosed
          ? `<span style="font-size:0.76rem;color:var(--text-muted);font-weight:700;">Cerrado</span>`
          : `<button class="td-close-team-btn td-close-team-btn--compact" data-action="close-team" data-team-id="${team.id_team}" type="button" title="Cerrar equipo">
              <span class="material-icons-round" style="font-size:0.88rem;vertical-align:middle;">lock</span>
              Cerrar
            </button>`
        : "";

      const row = `
        <tr ${this.isAdmin ? `class="td-clickable" data-team-id="${team.id_team}" style="cursor:pointer;" title="${t("teamsProjects.viewDetail")}"` : ""}>
          <td style="vertical-align:middle;">
            <strong style="font-size:0.88rem;">${team.name}</strong>${closedBadge}
          </td>
          <td style="vertical-align:middle;font-size:0.82rem;color:var(--text-muted);">
            ${team.description ?? ""}
          </td>
          <td style="vertical-align:middle;">
            <div class="app-avatar-group">${membersIcons}</div>
          </td>
          ${this.isAdmin ? `<td style="vertical-align:middle;">${this._renderAreaCounts(team)}</td>` : ""}
          ${this.isAdmin ? `<td style="vertical-align:middle;">${actionCell}</td>` : ""}
        </tr>
      `;

      tbody.insertAdjacentHTML("beforeend", row);
    });

    if (this.isAdmin && !this._listListenersAttached) {
      this._listListenersAttached = true;
      teamsContainer.addEventListener("click", (e) => {
        const closeBtn = e.target.closest("[data-action='close-team']");
        if (closeBtn) {
          e.preventDefault();
          e.stopPropagation();
          this._handleCloseTeam(closeBtn.dataset.teamId);
          return;
        }

        const row = e.target.closest("[data-team-id]");
        if (!row) return;
        this.router.navigate("teamDetail", { teamId: row.dataset.teamId });
      });
    }
  }

  attachEventHandlers() {
    const gridViewBtn = document.getElementById("grid-view-btn");
    const listViewBtn = document.getElementById("list-view-btn");
    const searchInput = document.getElementById("teamsSearchInput");
    const searchBtn   = document.getElementById("teamsSearchBtn");
    const toggle      = document.getElementById("semanticToggle");

    if (this.isAdmin) {
      this._injectAdminHintStyle();

      // Sync toggle state with this._semanticMode
      if (toggle) {
        toggle.checked = this._semanticMode;
        toggle.addEventListener("change", () => {
          this._semanticMode = toggle.checked;
          document.getElementById("semanticHint")?.classList.toggle("d-none", !this._semanticMode);
          // Reset search when switching modes
          if (searchInput) searchInput.value = "";
          this.searchQuery = "";
          this._applyFilters();
        });
      }
    }

    const runLocalSearch = () => {
      this.searchQuery = searchInput?.value?.trim() ?? "";
      this._applyFilters();
    };

    const runSemanticSearch = async () => {
      const query = searchInput?.value?.trim() ?? "";
      if (!query) {
        this.searchQuery = "";
        this._applyFilters();
        return;
      }
      const container = document.getElementById("teamsContainer");
      this.showLoading(container);
      try {
        const raw = await searchProjectsSemantic(query, this.eventId);
        const results = Array.isArray(raw) ? raw : (raw?.data ?? []);
        if (this.currentView === "list") {
          this._paintSemanticResultsList(results);
        } else {
          this._paintSemanticResults(results);
        }
      } catch (err) {
        console.error("[semantic search] error:", err);
        this._applyFilters();
      }
    };

    const runSearch = () => {
      if (this.isAdmin && this._semanticMode) {
        runSemanticSearch();
      } else {
        runLocalSearch();
      }
    };

    searchBtn?.addEventListener("click", () => {
      clearTimeout(this._searchDebounce);
      runSearch();
    });

    searchInput?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      clearTimeout(this._searchDebounce);
      runSearch();
    });

    searchInput?.addEventListener("input", () => {
      clearTimeout(this._searchDebounce);
      // Local search is live; semantic only triggers on submit to avoid API spam
      if (!this._semanticMode) {
        this._searchDebounce = setTimeout(runLocalSearch, 250);
      }
    });

    gridViewBtn?.addEventListener("click", async () => {
      gridViewBtn.classList.add("active");
      listViewBtn.classList.remove("active");
      this._listListenersAttached = false;
      await this.renderTeamsGrid();
    });

    listViewBtn?.addEventListener("click", async () => {
      listViewBtn.classList.add("active");
      gridViewBtn.classList.remove("active");
      this._gridListenersAttached = false;
      await this.renderTeamsList();
    });
  }

  _injectAdminHintStyle() {
    // Show the semantic search toggle only for admins
    document.getElementById("semanticToggleWrap")?.classList.remove("d-none");

    if (document.getElementById("td-close-team-style")) return;
    const style = document.createElement("style");
    style.id = "td-close-team-style";
    style.textContent = `
      .td-close-team-btn {
        border: 1px solid rgba(239, 68, 68, 0.28);
        background: rgba(239, 68, 68, 0.08);
        color: #b91c1c;
        border-radius: 8px;
        padding: 5px 9px;
        font-size: 0.75rem;
        font-weight: 700;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
      }

      .td-close-team-btn:hover {
        background: rgba(239, 68, 68, 0.14);
      }

      .td-close-team-btn:disabled {
        cursor: wait;
        opacity: 0.68;
      }

      .td-close-team-btn--compact {
        padding: 5px 8px;
      }
    `;
    document.head.appendChild(style);
  }

  async _handleCloseTeam(teamId) {
    const team = this.allTeams.find((item) => String(item.id_team) === String(teamId));
    const name = team?.name ?? "este equipo";
    const membersCount = team?.members?.length ?? 0;
    const impactMsg = `Acción Destructiva: Cierre de Equipo\n\n` +
      `• Equipo: ${name} (ID: ${teamId})\n` +
      `• Integrantes actuales: ${membersCount}\n` +
      `• Impacto: El equipo cambiará a estado cerrado, ya no aceptará nuevos integrantes ni solicitudes.\n\n` +
      `¿Confirmar el cierre definitivo del equipo?`;

    const confirmed = confirm(impactMsg);
    if (!confirmed) return;

    const buttons = document.querySelectorAll(`[data-action="close-team"][data-team-id="${teamId}"]`);
    buttons.forEach((btn) => {
      btn.disabled = true;
      btn.textContent = "Cerrando...";
    });

    try {
      const res = await closeTeam(teamId);
      const closedAt = res?.data?.team?.closed_at ?? res?.team?.closed_at ?? new Date().toISOString();
      this.allTeams = this.allTeams.map((item) =>
        String(item.id_team) === String(teamId) ? { ...item, closed_at: closedAt } : item,
      );
      this._applyFilters();
      toast.success("Equipo cerrado", "El equipo ha sido cerrado y auditado.");
    } catch (err) {
      toast.error("Error", err?.message ?? "No se pudo cerrar el equipo.");
      buttons.forEach((btn) => {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-icons-round" style="font-size:0.88rem;vertical-align:middle;">lock</span>Cerrar`;
      });
    }
  }

  destroy() {
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
