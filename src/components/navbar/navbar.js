import "../../assets/styles/navbar.css";
import { getNavLinks, getRoleLabel, getIcon } from "./navbar-config.js";
import { getInitials, getCurrentUser, logout } from "../../utils/helpers.js";
import { icons } from "../../utils/icons.js";

export default class Navbar {
  constructor(router) {
    this.router = router;
    this.user = getCurrentUser();
    this.currentRoute = "dashboard";
  }

  render() {
    const links = getNavLinks(this.user?.role);

    return `
      <aside class="sidebar">

        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="sidebar-brand-icon">
            ${icons.teamUp()}
          </div>
          <span class="sidebar-brand-name">TeamUp</span>
        </div>

        <!-- Nav links -->
        <nav class="sidebar-nav">
          <ul>
            ${links.map(link => `
              <li>
                <button
                  class="nav-link ${this.currentRoute === link.route ? "active" : ""}"
                  data-route="${link.route}"
                >
                  ${getIcon(link.icon)}
                  ${link.label}
                </button>
              </li>
            `).join("")}
          </ul>
        </nav>

        <!-- User + logout -->
        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="sidebar-avatar">${getInitials(this.user?.name)}</div>
            <div class="sidebar-user-info">
              <p class="sidebar-user-name">${this.user?.name ?? "User"}</p>
              <p class="sidebar-user-role">${getRoleLabel(this.user?.role)}</p>
            </div>
          </div>

          <button class="sidebar-logout" id="logoutBtn">
            ${icons.logout()}
            Sign out
          </button>
        </div>

      </aside>

      <div class="sidebar-offset"></div>
    `;
  }

  setActiveRoute(route) {
    this.currentRoute = route;
  }

  attachEventHandlers() {
    document.querySelectorAll(".nav-link").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentRoute = btn.dataset.route;
        this.router.navigate(btn.dataset.route);
      });
    });

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      logout();
      this.router.navigate("login");
    });
  }
}