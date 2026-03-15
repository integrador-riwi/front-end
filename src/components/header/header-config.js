import "../../assets/styles/header.css";
import { getHeaderLinks, getHeaderLayout } from "./header.js";
import { t } from "../../utils/i18n.js";
import {
  getCurrentUser,
  logout,
  getEventIdFromUrl,
  getEventSectionFromUrl,
} from "../../utils/helpers.js";

export default class Header {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getCurrentUser();
    this.eventName =
      params.eventName || localStorage.getItem("currentEventName") || "Event";
  }

  mountBreadcrumb(customLinks) {
    let links = customLinks || [];

    if (!customLinks) {
      const eventId = getEventIdFromUrl();
      const section = getEventSectionFromUrl();

      if (eventId) {
        const sectionLabels = {
          projects: t("nav.projects"),
          ranking: t("nav.ranking"),
          voting: t("nav.voting"),
          finalists: t("nav.finalists"),
          metrics: t("nav.metrics"),
        };

        links = [
          { label: t("nav.events"), route: "events" },
          {
            label: this.eventName || `Event ${eventId}`,
            route: `events/${eventId}`,
          },
        ];

        if (section) {
          links.push({
            label: sectionLabels[section] || section,
            route: null,
          });
        }
      } else {
        const route = this.router.currentRoute;
        links = getHeaderLinks(route);
      }
    }

    const breadcrumbHTML = this.renderBreadcrumb({ links });
    const container = document.getElementById("breadcrumb");

    if (container) {
      container.innerHTML = breadcrumbHTML;
      this.attachEventHandlers();
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
    console.log("HEADER ROUTE:", this.router.currentRoute);
    const route = this.router.currentRoute;
    const layout = getHeaderLayout(route);

    if (!layout) return "";

    if (layout.variant === "create-event") {
      return this.renderCreateEventHeader(layout);
    }

    return this.renderHeader(layout);
  }

  renderCreateEventHeader(layout) {
    return `
    <header class="app-header">
      <div class="container mx-0 app-header-inner">
        
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          
          <div>
            <nav class="app-breadcrumb">
              <ol id="breadcrumb" class="breadcrumb mb-2"></ol>
            </nav>
            <h1 class="app-page-title mb-0">
              ${layout.title}
            </h1>
          </div>
        </div>

      </div>
    </header>
  `;
  }

  renderHeader(layout) {
    return `
    <header class="app-header">
      
      <div class="container mx-0 app-header-inner">
        
        <nav class="app-breadcrumb">
          <ol id="breadcrumb" class="breadcrumb mb-2"></ol>
        </nav>
          <h1 class="app-page-title mb-0">
              ${layout.title}
          </h1>
      </div>
    </header>
  `;
  }

  attachEventHandlers() {
    document.querySelectorAll(".breadcrumb-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const route = link.dataset.route;

        if (link.dataset.route === "events") {
          localStorage.removeItem("currentEventId");
          localStorage.removeItem("currentEventName");
        }

        if (link.dataset.route === "coderEventSelect") {
          sessionStorage.removeItem("selectedEvent");
        }
        this.router.navigate(route);
      });
    });

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      logout();
      this.router.navigate("login");
    });
  }
}
