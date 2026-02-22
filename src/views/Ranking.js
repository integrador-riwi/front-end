import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser, clearSession } from "../utils/auth.js";
import { getDashboardForRole } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/ranking.css";
import "../assets/styles/components.css";

export default class Ranking {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
  }

  async render() {
    const app = document.getElementById("app");
    const dashboard = getDashboardForRole(this.user?.role, this.user);

    if (!dashboard) {
      clearSession(this.router);
      return;
    }

    const mainContent = await fetch(`../../pages/ranking_dashboard.html`).then(
      (r) => r.text(),
    );

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
      <main class="dashboard-main">
        ${mainContent}
      </main>
    `;

    const teams = [
      {
        name: "Turing Tech",
        project: "API Migration V2",
        category: "Software",
        score: 98,
        avatar: "https://i.pravatar.cc/150?img=1",
      },
      {
        name: "Tesla Team",
        project: "Autonomous AI",
        category: "Engineering",
        score: 92,
        avatar: "https://i.pravatar.cc/150?img=2",
      },
      {
        name: "Hamilton Group",
        project: "Green Energy UI",
        category: "Design",
        score: 89,
        avatar: "https://i.pravatar.cc/150?img=3",
      },
      {
        name: "Thompson Corp",
        project: "NextGen Logistics",
        category: "Operations",
        score: 85,
        avatar: "https://i.pravatar.cc/150?img=4",
      },
      {
        name: "Ritchie Sol",
        project: "Crypto Dashboard",
        category: "Blockchain",
        score: 82,
        avatar: "https://i.pravatar.cc/150?img=5",
      },
      {
        name: "Omega Alpha",
        project: "Social Connect",
        category: "Mobile",
        score: 78,
        avatar: "https://i.pravatar.cc/150?img=6",
      },
      {
        name: "Omega",
        project: "Social",
        category: "Mobile",
        score: 79,
        avatar: "https://i.pravatar.cc/150?img=7",
      },
    ];

    const sortedTeams = teams.sort((a, b) => b.score - a.score);

    const topProjects = sortedTeams.slice(0, 6);

    const container = document.getElementById("topTeamsContainer");

    topProjects.forEach((team, index) => {
      let borderHighlight = "";
      let badgeColor = "bg-primary";

      if (index === 0) {
        borderHighlight = "border-warning border-3 shadow";
      }

      const col = document.createElement("div");
      col.className = "col-12 col-md-12 col-lg-2";

      col.innerHTML = `
    <div class="card card-custom text-center p-4 h-100 ${borderHighlight}">
      ${index === 0 ? '<i class="bi bi-award-fill text-warning fs-3"></i>' : ""}
      <img src="${team.avatar}" class="rounded-circle mx-auto my-3" width="90">
      <h5>${team.name}</h5>
      <small class="text-muted d-block mb-2">${team.project}</small>
      <span class="badge ${badgeColor} mb-3">${team.category}</span>
      <h3 style="color: var(--color-primary);">${team.score}/100</h3>
    </div>
  `;

      container.appendChild(col);
    });

    const rankingBody = document.getElementById("rankingTableBody");

    sortedTeams.forEach((team, index) => {
      const rank = index + 1;
      const progress = team.score; // usamos el score como %

      const row = document.createElement("tr");

      row.innerHTML = `
    <td class="fw-bold text-muted">${rank}</td>

    <td>
      <div class="d-flex align-items-center">
        <img src="${team.avatar}" 
             class="rounded-circle me-3" 
             width="40" height="40">
        <div>
          <strong>${team.name}</strong><br>
          <small class="text-muted">${team.project}</small>
        </div>
      </div>
    </td>

    <td>
      <span class="badge bg-secondary">${team.category}</span>
    </td>

    <td>
      <div class="progress" style="height:8px;">
        <div class="progress-bar progress-bar-primary"
             style="width:${progress}%">
        </div>
      </div>
      <small class="text-muted">${progress}%</small>
    </td>

    <td class="text-end fw-bold">
      ${team.score}
    </td>
  `;

      rankingBody.appendChild(row);
    });

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();
    dashboard.attachEventHandlers?.();
  }
}
