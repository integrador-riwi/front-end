import { getNavLinks, getRoleLabel, getIcon } from "./navbar-config.js";

import {
  getInitials,
  getCurrentUser,
  logout,
  renderAvatar,
} from "../../utils/helpers.js";
import { icons } from "../../utils/icons.js";
import { t, toggleLang, getLang, onLangChange } from "../../utils/i18n.js";
import "../../assets/styles/navbar.css";

export default class Navbar {
  constructor(router) {
    this.router = router;
    const state = this.router.getAppState ? this.router.getAppState() : {};
    this.user = state.user || getCurrentUser();
    this.hasTeam = state.hasTeam || false;
    this.currentRoute = this.router.currentRoute || "dashboard";
    this._offLangChange = null;
  }

  render() {
    const links = getNavLinks(this.user?.role, this.hasTeam);

    console.log("HAS TEAM:", this.hasTeam);
    console.log("LINKS:", links);

    return `
    <!-- ── Sidebar (desktop) / Top Navbar (mobile) ── -->

    
    <nav class="mobile-nav d-flex align-items-center justify-content-between px-3 py-2 d-md-none">
  
  <!-- Brand -->
  <div class="sidebar-brand" >
  <div class="container d-flex align-items-center gap-2 p-2 " style="cursor: pointer;">
  <!-- MOBILE TOP NAVBAR -->
    <button class="hamburger" style= "width:40px; height:40px;">
      ${icons.burger()}
    </button>
    <div class="sidebar-brand-icon d-flex align-items-center justify-content-center flex-shrink-0 return-home">
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

  <button class="sidebar-logout d-flex align-items-center gap-3 w-100 logout-btn">
    ${icons.logout()}
    </div>

</nav>
      <!-- ── Desktop Sidebar ── -->
      <aside class="sidebar d-flex flex-column">

        <!-- Brand -->
        <div class="sidebar-brand d-flex align-items-center gap-3">
          <div class="container mx-0 d-flex align-items-center p-2 gap-2" style="cursor: pointer;">
              <button class="hamburger" style= "width:40px; height:40px;">
                ${icons.burger()}
              </button>
            <div class="sidebar-brand-icon d-flex align-items-center return-home justify-content-center flex-shrink-0">
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

          <div class="d-flex gap-2 mt-1">
            <button class="sidebar-logout flex-grow-1 d-flex align-items-center gap-3 logout-btn">
              ${icons.logout()}
              ${t("nav.signOut")}
            </button>
            <button class="btn btn-sm lang-toggle-btn" id="langToggleBtn" title="${t("nav.langLabel")}" style="flex-shrink:0; font-size:0.75rem; font-weight:600; border:1px solid var(--border); border-radius:8px; padding:0 10px;">
              ${t("nav.langToggle")}
            </button>
          </div>
        </div>

      </aside>
    `;
  }
  closeSidebarMobile() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    sidebar?.classList.remove("open");
    overlay?.classList.remove("active");
  }

  setActiveRoute(route) {
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.classList.remove("active");
    });

    const activeBtn = document.querySelector(`[data-route="${route}"]`);

    if (activeBtn) {
      activeBtn.classList.add("active");
    }
  }

  attachEventHandlers() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");
    const hamburger = document.querySelectorAll(".hamburger");

    // NAV LINKS
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.route === "events") {
          localStorage.removeItem("currentEventId");
          localStorage.removeItem("currentEventName");
        }

        if (btn.dataset.route === "coderEventSelect") {
          sessionStorage.removeItem("selectedEvent");
        }

        this.setActiveRoute(btn.dataset.route);
        this.router.navigate(btn.dataset.route);

        // cerrar sidebar en mobile
        this.closeSidebarMobile();
      });
    });

    // LOGOUT
    document.querySelectorAll(".logout-btn")?.forEach((e) => {
      e.addEventListener("click", () => {
        logout();
        this.router.navigate("login");
      });
    });

    // PROFILE
    document.querySelectorAll(".profileBtn")?.forEach((e) => {
      e.addEventListener("click", () => {
        this.setActiveRoute("profile");
        this.router.navigate("profile");

        this.closeSidebarMobile();
      });
    });

    // RETURN HOME
    document.querySelectorAll(".return-home")?.forEach((e) => {
      e.addEventListener("click", () => {
        let homeRoute;

        switch (this.user?.role) {
          case "ADMIN":
            homeRoute = "events";
            localStorage.removeItem("currentEventId");
            localStorage.removeItem("currentEventName");
            break;

          case "CODER":
            homeRoute = this.hasTeam ? "coderHome" : "coderEventSelect";
            break;

          case "organizer":
            homeRoute = "organizerHome";
            break;

          default:
            homeRoute = "dashboard";
        }

        this.setActiveRoute(homeRoute);
        this.router.navigate(homeRoute);

        this.closeSidebarMobile();
      });
    });

    // HAMBURGER
    hamburger?.forEach((e) => {
      e.addEventListener("click", () => {
        const isOpen = sidebar?.classList.contains("open");

        if (isOpen) {
          this.closeSidebarMobile();
        } else {
          sidebar?.classList.add("open");
          overlay?.classList.add("active");
        }
      });
    });

    // OVERLAY
    overlay?.addEventListener("click", () => {
      this.closeSidebarMobile();
    });

    // LANG TOGGLE
    document
      .getElementById("langToggleBtn")
      ?.addEventListener("click", async () => {
        await toggleLang();
      });
  }

  destroy() {}
}
