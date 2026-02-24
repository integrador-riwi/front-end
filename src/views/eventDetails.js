import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getEvents } from "../services/api.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/details.css";

export default class EventDetails {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.event = [];
    this.loading = true;
    this.error = null;
  }

  async fetchCurrentEvent() {
    try {
      this.loading = true;
      // const data = await getEvents();

      // MOCK DATA for visualization
      const data = {
        id: 3,
        title: "Capstone project Basic Route Cohort 6",
        description:
          "Upcoming capstone presentations for the newest Basic Route cohort. Get ready to see innovative terminal and web applications.",
        date: "2026-08-20T10:00:00", // Future date
        location: "Medellin",
      };
      return data;
    } catch (err) {
      console.error("Failed to fetch event:", err);
      this.error = "Error loading event. Please try again later.";
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

  renderEvent(event) {
    const title = event.title || event.name || "Untitled Event";
    const desc = event.description || "No description provided.";

    return `
        <div class="col-lg-8">
            <span class="badge-status mb-3 d-inline-block">● In Progress</span>
            <h1 class="fw-bold mb-3">${title}</h1>
            <p class="text-muted fs-5">
                ${desc}
            </p>
            </div>

            <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
            <button class="btn btn-outline-accent me-2">Edit Event</button>
        </div>
      `;
  }

  renderEventDate(event) {
    const date = event.date || event.start_date || event.createdAt;

    return `
        <small class="text-muted">Date & Time</small>
        <p class="fw-semibold mb-0">${this.formatDate(date)}</p>
      `;
  }

  renderEventLocation(event) {

    return `
        <small class="text-muted">Location</small>
        <p class="fw-semibold mb-0">${event.location}</p>        
      `;
  }

  async render() {
    const app = document.getElementById("app");

    const mainContent = await fetch(
      `../../pages/admin_event_details.html`,
    ).then((r) => r.text());

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
        <main class="dashboard-main">
        ${mainContent}
      </main>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    // Fetch data and re-render the list container
    const event = await this.fetchCurrentEvent();

    const eventContainer = document.getElementById("event-container");
    const dateContainer = document.getElementById("event-date");
    const locationContainer = document.getElementById("event-location");

    if (!eventContainer || !dateContainer || !locationContainer) return;

    eventContainer.innerHTML = this.renderEvent(event);
    dateContainer.innerHTML = this.renderEventDate(event);
    locationContainer.innerHTML = this.renderEventLocation(event);
    this.attachEventHandlers();
  }

  attachEventHandlers() {
    const viewProjectsBtn = document.getElementById("view-projects-btn");
    viewProjectsBtn.addEventListener("click", (e) => {
        const route = e.currentTarget.dataset.route;
        if (route) {
          this.router.navigate(route);
        }
      });
    
  }
}
