import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getEventById } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/qr-voting.css";

export default class QRVoting {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.eventId = params.eventId || null;
    this.event = null;
    this.loading = true;
    this.error = null;
  }

//   async fetchCurrentEvent() {
//     try {
//       this.loading = true;
      
//       if (!this.eventId) {
//         throw new Error('Event ID not provided');
//       }
      
//       const response = await getEventById(this.eventId);
//       this.event = response.data || response;
      
//     } catch (err) {
//       console.error("Failed to fetch event:", err);
//       this.error = err.message || "Error loading event. Please try again later.";
//     } finally {
//       this.loading = false;
//     }
//   }

async fetchCurrentEvent() {
  try {
    this.loading = true;

    //  SI NO HAY EVENT ID → SIMULAMOS
    if (!this.eventId) {
      console.warn("No Event ID provided. Using mock event.");

      this.event = {
        id: "mock-1",
        title: "Demo Final Pitch Event",
        description: "This is a simulated event for development purposes.",
        finalists: [
          {
            id: "p1",
            project_name: "EcoTrack",
            team_name: "Green Innovators",
          },
          {
            id: "p2",
            project_name: "HealthSync",
            team_name: "Vital Coders",
          },
          {
            id: "p3",
            project_name: "EduSmart",
            team_name: "Future Minds",
          },
        ],
      };

      return; // 
    }

    const response = await getEventById(this.eventId);
    this.event = response.data || response;

  } catch (err) {
    console.error("Failed to fetch event:", err);
    this.error =
      err.message || "Error loading event. Please try again later.";
  } finally {
    this.loading = false;
  }
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

renderFinalists(event) {
    const title = event.title || event.name || "Untitled Event";
    const description = event.description || "No description provided.";
    const finalists = event.finalists || [];

    return `
      <section class="container py-4">
        <div class="row mb-4">
          <div class="col-12">
            <h1 class="fw-bold mb-2">${title}</h1>
            <p class="text-muted">${description}</p>
          </div>
        </div>

        <div class="row g-4">
          ${
            finalists.length > 0
              ? finalists
                  .map(
                    (finalist) => `
              <div class="col-md-6 col-lg-4">
                <div class="card shadow-sm h-100 rounded-4 p-3">
                  <h5 class="fw-semibold mb-2">
                    ${finalist.project_name || "Unnamed Project"}
                  </h5>
                  <p class="text-muted small mb-2">
                    ${finalist.team_name || "Unknown Team"}
                  </p>
                  <button 
                    class="btn btn-outline-accent w-100 view-project-btn"
                    data-id="${finalist.id}"
                  >
                    View Project
                  </button>
                </div>
              </div>
            `
                  )
                  .join("")
              : `
              <div class="col-12">
                <div class="alert alert-light text-center">
                  No finalists available.
                </div>
              </div>
            `
          }
        </div>
      </section>
    `;
  }

    async render() {
    const app = document.getElementById("app");

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
      <main class="dashboard-main">
        <div id="finalists-container" class="container py-4"></div>
      </main>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    const container = document.getElementById("finalists-container");

    container.innerHTML = this.renderLoading();

    await this.fetchCurrentEvent();

    if (this.error) {
      container.innerHTML = this.renderError(this.error);
      return;
    }

    if (!this.event) {
      container.innerHTML = this.renderError("Event not found");
      return;
    }

    container.innerHTML = this.renderFinalists(this.event);

    this.attachEventHandlers();
  }

  attachEventHandlers() {
    document.querySelectorAll(".view-project-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;

        if (id) {
          this.router.navigate(`/projects/${id}`);
        }
      });
    });
  }
}
