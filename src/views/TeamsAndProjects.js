import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser, clearSession } from "../utils/auth.js";
import { getDashboardForRole } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";

export default class CreateEvent {
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

    const mainContent = await fetch (`../../pages/create_dashboard.html`).then(r => r.text())

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
      <main class="dashboard-main">
        ${mainContent}
      </main>
    `;
    this.header.mountBreadcrumb();
    this.header.attachEventHandlers();

    this.navbar.attachEventHandlers();
    dashboard.attachEventHandlers?.();
  }
}