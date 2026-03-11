import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser, clearSession } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";
import { apiFetch } from "../services/api.js";
import mainContent from "/pages/teams_dashboard.html?raw";

export default class Teams {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.eventId = localStorage.getItem("currentEventId");
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

  async render() {
    const app = document.getElementById("app");

    // const mainContent = await fetch (`/pages/teams_dashboard.html`).then(r => r.text())

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
  }

  async renderTeamsGrid() {
    const teamsContainer = document.getElementById("teamsContainer");
    teamsContainer.innerHTML = "";
    // ✅ Verificar que el elemento existe
    if (!teamsContainer) {
      console.error("Element #teamsContainer not found");
      return;
    }

    const fetchTeams = await apiFetch(
      `/teams?limit=50${this.eventId ? `&idEvent=${this.eventId}` : ""}`,
      { method: "GET" },
    );
    const totalTeams = fetchTeams.data.teams;

    // ✅ Usar Promise.all + for...of en lugar de .map() con async
    await Promise.all(
      totalTeams.map(async (team) => {
        const members = await apiFetch(`/teams/${team.id_team}/members`, {
          method: "GET",
        });
        console.log(members);
        const membersIcons = this.renderAvatars(members.data.members);

        const card = `
          <div class="col-12 col-md-6 col-lg-4">
            <div class="app-project-card">
              <div class="app-project-image">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkiRe_OIFc5LnfH8E47l0JCD12t1WIUi-0jZCaj4pKMIED7WLD80FOkYpZMh9EzRCwKulfJkGWTtRHFykfSawQoMnQ0V9sOC2WXLAQecUyQFk6nn7oFqSBCWRIBTbouoiFMtC3phUERbubp7XZ-x5b59GrloQC5Eyts7NSudlzGFtFpX4FHJZ8QQR8klcHxzx2sBK6fpogWOMmlFNB9EChbZ_fMZ32SKMMd9h1u__l9dT5pU0a0mgPGH8qfoLKodNVNjpH1bFOOZk"
                  alt="Project image"
                  class="img-fluid"
                />
                <span class="app-project-badge engineering">${members.data.members[0]?.clan}</span>
              </div>
              <div class="p-4">
                <h5 class="app-card-title">${team.name}</h5>
                <p class="app-card-text text-break">${team.description}</p>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div class="app-avatar-group">
                    ${membersIcons}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        teamsContainer.insertAdjacentHTML("beforeend", card);
      }),
    );
  }

  async renderTeamsList() {
    const teamsContainer = document.getElementById("teamsContainer");

    // ✅ Verificar que el elemento existe
    if (!teamsContainer) {
      console.error("Element #teamsContainer not found");
      return;
    }
    teamsContainer.innerHTML = "";
    teamsContainer.innerHTML = `
    <div class="col-12 px-0">
      <div class="app-project-card-list p-3">
        <table class="table table-striped table-hover" style="width:100%;">
          <thead>
            <tr>
              <th style="width:20%;">Clan</th>
              <th style="width:20%;">Project</th>
              <th style="width:45%;">Description</th>
              <th style="width:15%;">Team</th>
            </tr>
          </thead>
          <tbody id="teamsTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

    const tbody = document.getElementById("teamsTableBody");

    const fetchTeams = await apiFetch(
      `/teams?limit=100${this.eventId ? `&idEvent=${this.eventId}` : ""}`,
      { method: "GET" },
    );
    const totalTeams = fetchTeams.data.teams;

    for (const team of totalTeams) {
      const members = await apiFetch(`/teams/${team.id_team}/members`, {
        method: "GET",
      });

      const membersIcons = this.renderAvatars(members.data.members);

      const clan = members.data.members?.[0]?.clan || "N/A";

      const row = `
      <tr>
        <td>
          <span class="app-project-badge engineering">${clan}</span>
        </td>
        <td>
          <h5 class="app-card-title fs-6">${team.name}</h5>
        </td>
        <td>
          <p class="app-card-text text-break">${team.description}</p>
        </td>
        <td>
          <div class="app-avatar-group">
            ${membersIcons}
          </div>
        </td>
      </tr>
    `;

      tbody.insertAdjacentHTML("beforeend", row);
    }
  }

  attachEventHandlers() {
    const gridViewBtn = document.getElementById("grid-view-btn");
    const listViewBtn = document.getElementById("list-view-btn");

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
}
