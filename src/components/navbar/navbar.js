import { getNavLinks, getRoleLabel, getIcon } from "./navbar-config.js";
import {
  getInitials,
  getCurrentUser,
  logout,
  renderAvatar,
} from "../../utils/helpers.js";
import { icons } from "../../utils/icons.js";
import "../../assets/styles/navbar.css";
export default class Navbar {
  constructor(router) {
    this.router = router;
    this.user = getCurrentUser();
    this.currentRoute = "dashboard";
  }

  render() {
    const links = getNavLinks(this.user?.role);

    return `
    <!-- ── Sidebar (desktop) / Top Navbar (mobile) ── -->

<!-- MOBILE TOP NAVBAR -->
    <button class="hamburger" id="hamburgerBtn">
      ${icons.burger()}
    </button>
<nav class="mobile-nav d-flex align-items-center justify-content-between px-3 py-2 d-md-none">
  
  <!-- Brand -->
  <div class="sidebar-brand" >
  <div class="container d-flex align-items-center gap-2 p-2 return-home" style="cursor: pointer;">
    <div class="sidebar-brand-icon d-flex align-items-center justify-content-center flex-shrink-0">
      ${icons.teamUp()}
    </div>
    <span class="sidebar-brand-name">TeamUp</span>
    </div>
  </div>


  <!-- Avatar -->
  <div class="d-flex align-items-center">
  <div class="sidebar-avatar d-flex align-items-center justify-content-center flex-shrink-0 profileBtn" style="cursor:pointer;">
    ${
      this.user?.github_avatar_url
        ? `<img src="${this.user.github_avatar_url}" alt="${this.user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
        : getInitials(this.user?.name)
    }
  </div>

  <button class="sidebar-logout d-flex align-items-center gap-3 w-100" id="logoutBtn">
    ${icons.logout()}
    </div>

</nav>
      <!-- ── Desktop Sidebar ── -->
      <aside class="sidebar d-flex flex-column">

        <!-- Brand -->
        <div class="sidebar-brand d-flex align-items-center gap-3">
          <div class="container d-flex align-items-center p-2 gap-2 return-home" style="cursor: pointer;">
            <div class="sidebar-brand-icon d-flex align-items-center justify-content-center flex-shrink-0">
              ${icons.teamUp()}
            </div>
            <span class="sidebar-brand-name">TeamUp</span>
          </div>
        </div>

        <!-- Nav links -->
        <nav class="sidebar-nav flex-grow-1 overflow-auto py-3 px-2">
          <ul class="d-flex flex-column gap-1 list-unstyled m-0 p-0">
            ${links
              .map(
                (link) => `
              <li>
                <button
                  class="nav-link d-flex align-items-center gap-3 w-100 ${this.currentRoute === link.route ? "active" : ""}"
                  data-route="${link.route}"
                >
                  ${getIcon(link.icon)}
                  ${link.label}
                </button>
              </li>
            `,
              )
              .join("")}
          </ul>
        </nav>

        <!-- User + logout -->
        <div class="sidebar-footer p-3">
          <div class="sidebar-user d-flex align-items-center gap-3 rounded mb-1 px-2 py-2 profileBtn" style="cursor: pointer;">
            <div class="sidebar-avatar d-flex align-items-center justify-content-center flex-shrink-0">
              ${
                this.user?.github_avatar_url
                  ? `<img src="${this.user.github_avatar_url}" alt="${this.user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                  : getInitials(this.user?.name)
              }
            </div>
            <div class="sidebar-user-info flex-grow-1 overflow-hidden">
              <p class="sidebar-user-name text-truncate mb-0">${this.user?.name ?? "User"}</p>
              <p class="sidebar-user-role text-truncate mb-0">${getRoleLabel(this.user?.role)}</p>
            </div>
          </div>

          <button class="sidebar-logout d-flex align-items-center gap-3 w-100" id="logoutBtn">
            ${icons.logout()}
            Sign out
          </button>
        </div>

      </aside>


    `;
  }

  closeSidebarMobile() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    sidebar?.classList.remove("active");
    overlay?.classList.remove("active");
  }

  setActiveRoute(route) {
    this.currentRoute = route;

    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.route === route);
    });
  }

  attachEventHandlers() {
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setActiveRoute(btn.dataset.route);
        this.router.navigate(btn.dataset.route);
      });
    });

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      logout();
      this.router.navigate("login");
    });

    document.querySelectorAll(".profileBtn")?.forEach((e) => {
      e.addEventListener("click", () => {
        this.setActiveRoute("profile");
        this.router.navigate("profile");

        this.closeSidebarMobile();
      });
    });

    document.querySelectorAll(".return-home")?.forEach((e) => {
      e.addEventListener("click", () => {
        this.setActiveRoute("coderHome");
        this.router.navigate("coderHome");
        coderHome;
        console.log(this.router);
      });
    });

    const hamburger = document.getElementById("hamburgerBtn");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    hamburger?.addEventListener("click", () => {
      sidebar?.classList.toggle("active");
      overlay?.classList.toggle("active");
    });

    overlay?.addEventListener("click", () => {
      this.closeSidebarMobile();
    });
  }
}
