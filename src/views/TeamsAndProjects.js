import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser, clearSession } from "../utils/auth.js";
import { getDashboardForRole } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";

export default class Teams {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
  }

  renderAvatars(users) {
    const maxVisible = 3;
    const container = document.createElement("div");
    container.className = "app-avatar-group";

    users.slice(0, maxVisible).forEach((user) => {
      const img = document.createElement("img");
      img.src = user.avatar;
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
    const dashboard = getDashboardForRole(this.user?.role, this.user);

    if (!dashboard) {
      clearSession(this.router);
      return;
    }
    
    const mainContent = await fetch (`../../pages/teams_dashboard.html`).then(r => r.text())

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
      <main class="dashboard-main">
        ${mainContent}
      </main>
    `;


    const users = [
      { name: "Ana", avatar: "https://i.pravatar.cc/40?img=1" },
      { name: "Carlos", avatar: "https://i.pravatar.cc/40?img=2" },
      { name: "Luisa", avatar: "https://i.pravatar.cc/40?img=3" },
      { name: "Mateo", avatar: "https://i.pravatar.cc/40?img=4" },
      { name: "Sofía", avatar: "https://i.pravatar.cc/40?img=5" },
    ];

    const container = document.querySelector(".app-avatar-group");

    if (!container) return;

    container.innerHTML = this.renderAvatars(users);


    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();
    dashboard.attachEventHandlers?.();
  }
}