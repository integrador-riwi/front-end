import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser, clearSession } from "../utils/auth.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";
import { apiFetch } from "../services/api.js";
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
  }

  renderAvatars(users) {
    const maxVisible = 5;
    const container = document.createElement("div");
    container.className = "app-avatar-group";
    users.slice(0, maxVisible).forEach((user) => {
      const img = document.createElement("img");
      img.src = user.github_avatar_url;
      img.alt = user.name;
      img.className = "app-avatar";
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
    const teamsContainer = document.getElementById("teamsContainer");
    if (!teamsContainer) {
      console.error("Element #teamsContainer not found");
      return;
    }

    this.showLoading(teamsContainer);

    const fetchTeams = await apiFetch(`/teams?idEvent=${this.eventId}&limit=50&includeSubmitted=true`, { method: "GET"});
    const totalTeams = fetchTeams.data.teams;

    if (!totalTeams || totalTeams.length === 0) {
      this.showEmpty(teamsContainer);
      this.renderClanFilters([]);
      return;
    }

    this.allTeams = totalTeams;
    this.activeClans = new Set();
    this._gridListenersAttached = false;

    this.renderClanFilters(totalTeams);
    this._paintTeamsGrid(totalTeams, teamsContainer);
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

      const card = `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="app-project-card ${clickableClass}"
               ${dataAttr}
               ${adminHint}
               role="${this.isAdmin ? "button" : ""}"
               tabindex="${this.isAdmin ? "0" : ""}">
            <div class="app-project-image">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkiRe_OIFc5LnfH8E47l0JCD12t1WIUi-0jZCaj4pKMIED7WLD80FOkYpZMh9EzRCwKulfJkGWTtRHFykfSawQoMnQ0V9sOC2WXLAQecUyQFk6nn7oFqSBCWRIBTbouoiFMtC3phUERbubp7XZ-x5b59GrloQC5Eyts7NSudlzGFtFpX4FHJZ8QQR8klcHxzx2sBK6fpogWOMmlFNB9EChbZ_fMZ32SKMMd9h1u__l9dT5pU0a0mgPGH8qfoLKodNVNjpH1bFOOZk"
                alt="Project image"
                class="img-fluid"
              />
            </div>
            <div class="p-4">
              <h5 class="app-card-title">${team.name}</h5>
              <p class="app-card-text text-break">${team.description ?? ""}</p>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="app-avatar-group">
                  ${membersIcons}
                </div>
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
      `;

      container.insertAdjacentHTML("beforeend", card);
    });

    // Delegación de eventos — solo ADMIN, solo se adjunta una vez
    if (this.isAdmin && !this._gridListenersAttached) {
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
          <span style="width:8px;height:8px;border-radius:50%;display:inline-block;
            background:var(--color-primary);opacity:0.7;flex-shrink:0;"></span>
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
    if (this.activeClans.size === 0) {
      this._paintTeamsGrid(this.allTeams);
      return;
    }

    const filtered = this.allTeams.filter((team) =>
        (team.members ?? []).some((member) => this.activeClans.has(member.clan))
    );

    this._paintTeamsGrid(filtered);
  }

  async renderTeamsList() {
    const teamsContainer = document.getElementById("teamsContainer");
    if (!teamsContainer) {
      console.error("Element #teamsContainer not found");
      return;
    }

    this.showLoading(teamsContainer);

    const fetchTeams = await apiFetch(
        `/teams?limit=100${this.eventId ? `&idEvent=${this.eventId}` : ""}`,
        { method: "GET" },
    );
    const totalTeams = fetchTeams.data.teams;
    console.log("awita", totalTeams)
    if (!totalTeams || totalTeams.length === 0) {
      this.showEmpty(teamsContainer);
      return;
    }

    teamsContainer.innerHTML = `
      <div class="col-12 px-0">
        <div class="app-project-card-list p-3">
          <table class="table table-striped table-hover" style="width:100%;">
            <thead>
              <tr>
                <th style="width:20%;">${t("teamsProjects.leader")}</th>
                <th style="width:20%;">${t("teamsProjects.team")}</th>
                <th style="width:45%;">${t("teamsProjects.desc")}</th>
                <th style="width:15%;">${t("teamsProjects.members")}</th>
                ${this.isAdmin ? `<th style="width:10%;"></th>` : ""}
              </tr>
            </thead>
            <tbody id="teamsTableBody"></tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = document.getElementById("teamsTableBody");

    totalTeams.forEach((team) => {
      const members = team.members ?? [];
      const membersIcons = this.renderAvatars(members);

      const row = `
        <tr ${
          this.isAdmin
              ? `class="td-clickable" data-team-id="${team.id_team}" style="cursor:pointer;" title="${t("teamsProjects.viewDetail")}"`
              : ""
      }>
          <td><span style="font-size:0.85rem;">${team.leader_name ?? "—"}</span></td>
          <td><h5 class="app-card-title fs-6">${team.name}</h5></td>
          <td><p class="app-card-text text-break">${team.description ?? ""}</p></td>
          <td><div class="app-avatar-group">${membersIcons}</div></td>
          ${
          this.isAdmin
              ? `<td>
                 <button class="btn btn-sm btn-outline-primary td-row-detail-btn"
                         data-team-id="${team.id_team}">
                   <span class="material-icons-round" style="font-size:.9rem;vertical-align:middle;">visibility</span>
                 </button>
               </td>`
              : ""
      }
        </tr>
      `;

      tbody.insertAdjacentHTML("beforeend", row);
    });

    // Delegación de eventos en tabla — solo ADMIN
    if (this.isAdmin) {
      tbody.addEventListener("click", (e) => {
        const row = e.target.closest("[data-team-id]");
        if (!row) return;
        const teamId = row.dataset.teamId;
        this.router.navigate("teamDetail", { teamId });
      });
    }
  }

  attachEventHandlers() {
    const gridViewBtn = document.getElementById("grid-view-btn");
    const listViewBtn = document.getElementById("list-view-btn");

    if (this.isAdmin) {
      this._injectAdminHintStyle();
    }

    gridViewBtn?.addEventListener("click", async () => {
      gridViewBtn.classList.add("active");
      listViewBtn.classList.remove("active");
      await this.renderTeamsGrid();
    });

    listViewBtn?.addEventListener("click", async () => {
      listViewBtn.classList.add("active");
      gridViewBtn.classList.remove("active");
      await this.renderTeamsList();
    });
  }

  _injectAdminHintStyle() {
    if (document.getElementById("td-admin-hint-style")) return;
    const style = document.createElement("style");
    style.id = "td-admin-hint-style";
    style.textContent = `
      .td-view-detail-hint {
        font-size: 0.75rem;
        color: var(--color-primary, #6366f1);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        opacity: 0;
        transition: opacity .2s;
      }
      .td-clickable:hover .td-view-detail-hint { opacity: 1; }
      .td-clickable {
        cursor: pointer;
        transition: transform .18s, box-shadow .18s;
      }
      .td-clickable:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,.1);
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
