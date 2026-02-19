import "../../assets/styles/header.css";
import { getHeaderLinks, getHeaderLayout } from "./header-config.js";
import { getCurrentUser, logout } from "../../utils/helpers.js";
import { icons } from "../../utils/icons.js";

export default class Header {
  constructor(router) {
    this.router = router;
    this.user = getCurrentUser();
  }

  mountBreadcrumb() {
    const route = this.router.currentRoute;

    const links = getHeaderLinks(route);

    const breadcrumbHTML = this.renderBreadcrumb({
      links,
      currentRoute: route,
      icons,
    });

    const container = document.getElementById("breadcrumb");

    if (container) {
      container.innerHTML = breadcrumbHTML;
    }
  }

  renderBreadcrumb({ links }) {
    if (!links || links.length === 0) return "";

    return links
      .map((item, index) => {
        const isLast = index === links.length - 1;

        if (isLast) {
          return `
          <li class="breadcrumb-item active" aria-current="page">
            ${item.label}
          </li>
        `;
        }

        return `
        <li class="breadcrumb-item">
          <a href="#" data-route="${item.route}" class="breadcrumb-link">
            ${item.label}
          </a>
        </li>
      `;
      })
      .join("");
  }

  render() {
    const route = this.router.currentRoute;
    const layout = getHeaderLayout(route);

    if (!layout) return "";

    if (layout.variant === "create-event") {
      return this.renderCreateEventHeader(layout);
    }

    if (layout.variant === "teams") {
      return this.renderTeamsHeader();
    }

    return "";
  }

  renderCreateEventHeader(layout) {
    return `
    <header class="app-header">
      <div class="container app-header-inner">
        
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          
          <div>
            <nav class="app-breadcrumb">
              <ol id="breadcrumb" class="breadcrumb mb-1"></ol>
            </nav>
            <h1 class="app-page-title mb-0">
              ${layout.title}
            </h1>
          </div>

          <div class="d-flex align-items-center gap-2">
            <button class="app-btn-outline d-flex align-items-center gap-2">
              ${icons.visibility()}
              Preview
            </button>

            <button class="app-btn-primary d-flex align-items-center gap-2">
              ${icons.save()}
              Publish Event
            </button>
          </div>

        </div>

      </div>
    </header>
  `;
  }

  renderTeamsHeader() {
    return `
    <header class="app-header">
      
      <div class="container app-header-inner">
        
        <nav class="app-breadcrumb">
          <ol id="breadcrumb" class="breadcrumb mb-3"></ol>
        </nav>

        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">

          <div class="w-100" style="max-width: 380px;">
            <input 
              type="text"
              class="app-search-input"
              placeholder="Search projects, tasks, or people..."
            />
          </div>

          <div>
            <button class="app-btn-primary">
              New Project
            </button>
          </div>

        </div>

      </div>

    </header>
  `;
  }

  attachEventHandlers() {
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".nav-link")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.router.navigate(btn.dataset.route);
      });
    });

    document.querySelectorAll(".breadcrumb-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const route = link.dataset.route;
        this.router.navigate(route);
      });
    });

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      logout();
      this.router.navigate("login");
    });
  }
}
