import Navbar from "../components/navbar/navbar.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";

export default class DashboardView {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
  }

  async render() {
    const app = document.getElementById("app");

    const mainContent = await fetch (`../../pages/admin_dashboard.html`).then(r => r.text())

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="dashboard-main">
        ${mainContent}
      </main>
    `;

    this.navbar.attachEventHandlers();
  }
}
