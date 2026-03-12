import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getEvents } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import { toast } from "../components/Toast/index.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import { icons } from "./../utils/icons.js";

export default class EventsView {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.events = [];
    this.loading = true;
    this.error = null;
  }

  async fetchEvents() {
    try {
      this.loading = true;

      const response = await getEvents();

      const data = response.data?.events || response.events || [];

      if (Array.isArray(data)) {
        this.events = data.sort((a, b) => {
          const dateA = a.date || a.start_date || a.createdAt || "";
          const dateB = b.date || b.start_date || b.createdAt || "";
          return new Date(dateA) - new Date(dateB);
        });
      } else {
        this.events = [];
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      this.error = err.message || "Error loading events. Please try again later.";
      toast.error('Error', this.error);
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

  renderEventCard(event) {
    const title = event.title || event.name || "Untitled Event";
    const desc = event.description || "No description provided.";
    const date = event.date || event.start_date || event.createdAt;
    const eventId = event.id;

    return `
        <div class="bg-white rounded-4 p-4 ct-card-shadow d-flex flex-column flex-lg-row gap-4 align-items-md-center mb-4" style="border-left: 5px solid var(--color-primary);">
          <div class="container d-flex gap-4 flex-column flex-md-row">
            <div class="d-flex flex-column align-items-center justify-content-center bg-light rounded-4 p-3 flex-shrink-0" style="min-width: 100px; border: 1px solid var(--border);">
              <span class="fs-5 fw-bold" style="color: var(--color-primary);">
                ${date ? new Date(date).getDate() : "-"}
              </span>
              <span class="text-uppercase fw-semibold" style="font-size: 0.85rem; color: var(--text-sidebar);">
                ${date ? new Date(date).toLocaleString("en-US", { month: "short" }) : "TBD"}
              </span>
            </div>

            <div class="flex-grow-1">
              <h3 class="mb-2 text-wrap" style="font-size: 1.25rem; font-weight: 700; color: var(--color-text-main); word-break: break-word;">${title}</h3>
              <p class="mb-2" style="font-size: 0.95rem; color: var(--text-sidebar);">${desc}</p>
              <div class="d-flex flex-wrap gap-3 mt-3">
                <div class="d-flex align-items-center gap-1" style="font-size: 0.85rem; color: var(--text-sidebar);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Ends: ${this.formatDate(date)}
                </div>
              </div>
            </div>

          </div>
          
          <div class="flex-shrink-0 mt-3 mt-md-0 d-flex flex-column flex-md-row flex-lg-column gap-2" style="min-width: 150px;">
          
            <button class="btn rounded-pill px-4 py-2 w-100 fw-semibold btn-view-projects" data-route="details" data-event-name="${title}" data-event-id="${eventId}" style="border: 2px solid var(--color-primary); color: var(--color-primary); background: transparent; transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='var(--accent-dim)'" onmouseout="this.style.background='transparent'">
              Details
            </button>
            <button class="btn rounded-pill px-4 py-2 w-100 fw-semibold text-white" style="background-color: var(--color-primary); border: 2px solid var(--color-primary); transition: all 0.2s ease;" onmouseover="this.style.backgroundColor='var(--color-primary-dark)'" onmouseout="this.style.backgroundColor='var(--color-primary)'">
              Finalists
            </button>
          </div>
        </div>
      `;
  }

  renderEventsList() {
    if (this.loading) {
      return `
        <div class="d-flex justify-content-center align-items-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;
    }

    if (this.error) {
      return `
        <div class="alert alert-danger rounded-4 mt-4" role="alert">
          ${this.error}
        </div>
      `;
    }

    if (!this.events || this.events.length === 0) {
      return `
        <div class="bg-white rounded-4 p-5 ct-card-shadow text-center mt-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" style="width: 48px; height: 48px; margin-bottom: 1rem;">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h4 class="text-muted">No upcoming events</h4>
          <p class="text-muted mb-0">Check back later for new events.</p>
        </div>
      `;
    }

    const now = new Date();
    const pastEvents = this.events.filter(
      (e) => new Date(e.date || e.start_date || e.createdAt) < now,
    );
    const inProgressEvents = this.events.filter(
      (e) => new Date(e.date || e.start_date || e.createdAt) >= now,
    );

    return `
      <div class="d-flex flex-column mt-4">
        
        <!-- IN PROGRESS EVENTS -->
        ${
          inProgressEvents.length > 0
            ? `
            <div class="mb-5">
                <h2 class="h4 mb-3 d-flex align-items-center gap-2" style="color: var(--color-primary); font-weight: 700;">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: var(--mint);"></span>
                  In Progress
                </h2>
                <div class="d-flex flex-column">
                  ${inProgressEvents.map((event) => this.renderEventCard(event)).join("")}
                </div>
            </div>
        `
            : ""
        }

        <!-- PAST EVENTS -->
        ${
          pastEvents.length > 0
            ? `
            <div>
                <h2 class="h4 mb-3 d-flex align-items-center gap-2" style="color: var(--text-sidebar); font-weight: 600;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
                     <circle cx="12" cy="12" r="10"></circle>
                     <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  Past Events
                </h2>
                <div class="d-flex flex-column opacity-75">
                  ${pastEvents.map((event) => this.renderEventCard(event)).join("")}
                </div>
            </div>
        `
            : ""
        }

        ${
          inProgressEvents.length === 0 && pastEvents.length === 0
            ? `
           <p class="text-muted mt-3">No events found.</p>
        `
            : ""
        }

      </div>
    `;
  }

  async render() {
    const app = document.getElementById("app");

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
      <main class="dashboard-main min-vh-100" style="background-color: var(--color-bg); padding-top: 2rem;">
        <div class="container-xl px-3 px-md-4 py-4 mt-1">
          
          <!-- Page Header -->
          <div class="d-flex flex-column gap-2 mb-5 pb-3 border-bottom" style="border-color: var(--border) !important;">
            <div class="d-flex align-items-center justify-content-between gap-3">
              <div class="d-flex align-items-center gap-3">
                <div class="p-3 rounded-circle" style="background-color: var(--accent-dim); color: var(--color-primary);">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 28px; height: 28px;">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h1 class="mb-0 fw-bold" style="color: var(--color-primary); font-size: 2.25rem; letter-spacing: -0.5px;">Upcoming Events</h1>
              </div>
            </div>
            <p class="mb-0 ps-3" style="color: var(--text-sidebar); font-size: 1.05rem;">Discover and track ongoing and past project capstones and events.</p>
            
          </div>

          <div id="events-container">
            ${this.renderEventsList()}
          </div>
        </div>
      </main>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    await this.fetchEvents();

    const container = document.getElementById("events-container");
    if (container) {
      container.innerHTML = this.renderEventsList();
      this.attachEventHandlers();
    }
  }

  attachEventHandlers() {
    const viewProjectBtns = document.querySelectorAll(".btn-view-projects");
    viewProjectBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const route = e.currentTarget.dataset.route;
        const eventId = e.currentTarget.dataset.eventId;
        const eventName = e.currentTarget.dataset.eventName;

        if (route && eventId) {
          localStorage.setItem("currentEventId", eventId);
          localStorage.setItem("currentEventName", eventName);
          //this.router.navigate(`events/${eventId}`);
          this.router.navigate("dashboard", {
            id: eventId,
            name: eventName,
          });
        }
      });
    });
    const newEventBtn = document.getElementById("new-event-button");
    newEventBtn?.addEventListener("click", () => {
      this.router.navigate("events/create");
    });
  }
}
