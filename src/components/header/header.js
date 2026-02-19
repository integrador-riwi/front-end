import "../../assets/styles/header.css";
import { getHeaderLinks} from "./header-config.js";
import { getCurrentUser, logout } from "../../utils/helpers.js";
import { icons } from "../../utils/icons.js";

export default class Header {
  constructor(router) {
    this.router = router;
    this.user = getCurrentUser();
    this.currentRoute = "events/create";
  }

  mountBreadcrumb() {
    const links = getHeaderLinks(this.user.role);

    const breadcrumbHTML = this.renderBreadcrumb({
      links,
      currentRoute: this.currentRoute,
      icons
    });

    const container = document.getElementById("breadcrumb");

    if (container) {
      container.innerHTML = breadcrumbHTML;
    }
  }

  renderBreadcrumb({ links, currentRoute, icons }) {
    const orderedItems = links
      .filter(link => 
        currentRoute.startsWith(link.route) ||
        link.route === "projects"
      )

    return orderedItems
      .map((item, index) => {
        const isLast = index === orderedItems.length - 1;

        return `
          <li class="${isLast ? 'text-[var(--color-primary)] font-medium' : ''}">
            ${item.label}
          </li>
          ${!isLast ? `<li>${icons.chevron_right()}</li>` : ''}
        `;
      })
      .join("");
  }

  render() {
    
    return `
        <header
          class="bg-[var(--color-surface)] text-[var(--color-text-header)] shadow-sm sticky top-0 z-20"
        >
          <div class="site-header px-4 sm:px-6 lg:px-8 py-5">
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <nav class="flex text-sm mb-1">
                  <ol id="breadcrumb" class="flex items-center space-x-2"></ol>
                </nav>
                <h1 class="text-2xl font-bold text-[var(--color-title-header)]">
                  Create New Event
                </h1>
              </div>
              <div class="flex items-center gap-3">
                <button
                  class="flex justify-between gap-2 items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-[var(--color-button-text-theme)] bg-white dark:bg-surface-dark rounded-lg hover:bg-[var(--color-hover-button)] hover:text-[var(--color-bg)] transition-colors text-sm font-medium shadow-sm"
                >
                  ${icons.visibility()}
                  Preview
                </button>
                <button
                  class="flex justify-between gap-2 items-center px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-primary/30"
                >
                  ${icons.save()}
                  Publish Event
                </button>
              </div>
            </div>
          </div>
        </header>
    `;
  }

  setActiveRoute(route) {
    console.log(route)
    this.currentRoute = route;
    this.mountBreadcrumb();
  }

  attachEventHandlers() {
    document.querySelectorAll(".nav-link").forEach(btn => {
      btn.addEventListener("click", () => {
        this.setActiveRoute(btn.dataset.route);
        this.router.navigate(btn.dataset.route);
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