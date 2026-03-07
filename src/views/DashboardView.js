import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";

export default class DashboardView {
  constructor(router,params) {
    this.router = router;
    this.user = getUser();
    this.eventId = params?.id;
    this.eventName = params?.name;
    this.navbar = new Navbar(router);
    this.header = new Header(router, {eventName : this.eventName});
console.log("DASHBOARD PARAMS:", params);
  }

  async render() {
    
    const app = document.getElementById("app");

    const mainContent = await fetch (`../../pages/admin_dashboard.html`).then(r => r.text())
    console.log(this.router.currentRoute)

    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0">
        ${this.header.render()}
          <main class="dashboard-main">
          ${mainContent}
        </main>
      </div>
    `;

    this.navbar.attachEventHandlers();
    this.header.mountBreadcrumb();
    this.header.attachEventHandlers();
  }
}
