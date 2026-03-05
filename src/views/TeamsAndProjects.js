import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser, clearSession } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";
import {apiFetch} from "../services/api.js";

export default class Teams {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
  }

  renderAvatars(users) {
    const maxVisible = 5;
    const container = document.createElement("div");
    container.className = "app-avatar-group";
    console.log("sorner", users)
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

    const mainContent = await fetch (`../../pages/teams_dashboard.html`).then(r => r.text())

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
    await this.renderTeams();
    //dashboard.attachEventHandlers?.();
  }

  async renderTeams() {
    const teamsContainer = document.getElementById("teamsContainer")
    const fetchTeams = await apiFetch('/teams?limit=50', { method: 'GET' })
    const totalTeams = fetchTeams.data.teams
  
    totalTeams.map(async (team) => {
      const members = await apiFetch(`/teams/${team.id_team}/members`, { method: 'GET' })
      console.log(members)
      const membersIcons = this.renderAvatars(members.data.members);
      let card = `
        <div class="col-12 col-md-6 col-lg-4">
          <div class="app-project-card">
            <div class="app-project-image">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkiRe_OIFc5LnfH8E47l0JCD12t1WIUi-0jZCaj4pKMIED7WLD80FOkYpZMh9EzRCwKulfJkGWTtRHFykfSawQoMnQ0V9sOC2WXLAQecUyQFk6nn7oFqSBCWRIBTbouoiFMtC3phUERbubp7XZ-x5b59GrloQC5Eyts7NSudlzGFtFpX4FHJZ8QQR8klcHxzx2sBK6fpogWOMmlFNB9EChbZ_fMZ32SKMMd9h1u__l9dT5pU0a0mgPGH8qfoLKodNVNjpH1bFOOZk"
                alt="Project image"
                class="img-fluid"
              />
              <span class="app-project-badge engineering"> ${members.data.members[0]?.clan} </span>
            </div>
    
            <div class="p-4">
              <h5 class="app-card-title"> ${team.name} </h5>
    
              <p class="app-card-text">
                ${team.description}
              </p>
    
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="app-avatar-group">
                  <!-- avatars THIS WILL RENDER DINAMICALLY -->
                ${membersIcons}
                </div>
            </div>
          </div>
        </div>
      `
      teamsContainer.insertAdjacentHTML('beforeend', card);
    })
  }
}
