import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import AdminDashboard from "../components/dashboards/AdminDashboard.js";
import { getUser, clearSession } from "../utils/auth.js";
import { getDashboardForRole } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";

export default class CreateEvent {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.dashboard = new AdminDashboard(this.user);
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
    this.header.mountBreadcrumb();
    this.dashboard.render();
    this.navbar.attachEventHandlers();
    dashboard.attachEventHandlers?.();
  }
}