import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventById } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/details.css";
export default class EventDetails {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.eventId = params.eventId || null;
    this.eventName = params?.name;
    this.event = null;
    this.loading = true;
    this.error = null;
  }

  async fetchCurrentEvent() {
    try {
      this.loading = true;

      if (!this.eventId) {
        throw new Error("Event ID not provided");
      }

      const response = await getEventById(this.eventId);
      this.event = response.data || response;
    } catch (err) {
      console.error("Failed to fetch event:", err);
      this.error = err.message || t("common.error");
      toast.error("Error", this.error);
    } finally {
      this.loading = false;
    }
  }

  formatDate(dateString) {
    if (!dateString) return "TBD";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getStatusBadge(status) {
    if (status === "COMPLETED") {
      return `<span class="badge-status mb-3 d-inline-block">${t("eventDetails.completed")}</span>`;
    } else if (status === "UPCOMING") {
      return `<span class="badge-status mb-3 d-inline-block">${t("eventDetails.upcoming")}</span>`;
    } else if (status === "IN_PROGRESS") {
      return `<span class="badge-status mb-3 d-inline-block">${t("eventDetails.inProgress")}</span>`;
    }
    return `<span class="badge-status mb-3 d-inline-block">${status}</span>`;
  }

  renderEvent(event) {
    const title = event.title || event.name || "Untitled Event";
    const desc = event.description || t("common.noDescription");

    return `
        <div class="col-lg-8">
            ${this.getStatusBadge(event.status)}
            <h1 class="fw-bold mb-3">${title}</h1>
            <p class="text-muted fs-5">
                ${desc}
            </p>
            </div>

            <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
            <button class="btn btn-outline-accent me-2">${t("eventDetails.edit")}</button>
        </div>
      `;
  }

  renderEventDate(event) {
    const date = event.date || event.start_date || event.createdAt;

    return `
        <small class="text-muted">${t("eventDetails.dateTime")}</small>
        <p class="fw-semibold mb-0">${this.formatDate(date)}</p>
      `;
  }

  renderEventInfo(event) {
    return `
        <small class="text-muted">${t("eventDetails.type")}</small>
        <p class="fw-semibold mb-0">${event.event_type || t("eventDetails.na")}</p>
        
        <small class="text-muted mt-3 d-block">${t("eventDetails.cohort")}</small>
        <p class="fw-semibold mb-0">${event.cohort || t("eventDetails.na")}</p>
        
        <small class="text-muted mt-3 d-block">${t("eventDetails.route")}</small>
        <p class="fw-semibold mb-0">${event.route || t("eventDetails.na")}</p>
      `;
  }

  renderLoading() {
    return `
        <div class="d-flex justify-content-center align-items-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;
  }

  renderError(message) {
    return `
        <div class="alert alert-danger rounded-4 mt-4" role="alert">
          ${message}
        </div>
      `;
  }

  async render() {
    const app = document.getElementById("app");

    const mainContent = await fetch(
      `../../pages/admin_event_details.html`,
    ).then((r) => r.text());

    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0">
        ${this.header.render()}
          <main class="dashboard-main">
          ${mainContent}
        </main>
      </div>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    const eventContainer = document.getElementById("event-container");
    const dateContainer = document.getElementById("event-date");
    const locationContainer = document.getElementById("event-location");

    if (!eventContainer || !dateContainer || !locationContainer) {
      console.error("Container elements not found");
      return;
    }

    eventContainer.innerHTML = this.renderLoading();

    await this.fetchCurrentEvent();

    if (this.error) {
      eventContainer.innerHTML = this.renderError(this.error);
      return;
    }

    if (!this.event) {
      eventContainer.innerHTML = this.renderError(
        t("events.notFound") ?? t("events.notFound") ?? "Event not found",
      );
      return;
    }

    eventContainer.innerHTML = this.renderEvent(this.event);
    dateContainer.innerHTML = this.renderEventDate(this.event);
    locationContainer.innerHTML = this.renderEventInfo(this.event);

    this.attachEventHandlers();

    this._offLangChange = onLangChange(() => this.render());
  }

  attachEventHandlers() {
    const viewProjectsBtn = document.getElementById("view-projects-btn");
    viewProjectsBtn?.addEventListener("click", (e) => {
      const route = e.currentTarget.dataset.route;
      if (route) {
        this.router.navigate(route);
      }
    });
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
