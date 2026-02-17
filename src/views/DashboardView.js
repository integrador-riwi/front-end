import Navbar from "../components/navbar/navbar.js";
import { getUser, clearSession } from "../utils/auth.js";
import { getDashboardForRole } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";

export default class DashboardView {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
  }

  render() {
    const app = document.getElementById("app");
    const dashboard = getDashboardForRole(this.user?.role, this.user);

    if (!dashboard) {
      clearSession(this.router);
      return;
    }

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="dashboard-main">
        ${dashboard.render()}
      </main>
    `;

    this.navbar.attachEventHandlers();
    dashboard.attachEventHandlers?.();
  }
}
