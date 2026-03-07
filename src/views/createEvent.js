import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import { createEvent } from "../services/api-events.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";

export default class CreateEvent {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.loading = false;
    this.error = null;
  }

  getFormData() {
    const inputs = document.querySelectorAll(".app-input");
    const titleInput = inputs[0];
    const descriptionInput = inputs[1];
    const categorySelect = inputs[2];
    const visibilitySelect = inputs[3];

    const dates = document.querySelectorAll('input[type="date"]');

    return {
      title: titleInput?.value || "",
      description: descriptionInput?.value || "",
      eventType: this.mapCategoryToEventType(categorySelect?.value || ""),
      cohort: "",
      route: this.mapVisibilityToRoute(visibilitySelect?.value || ""),
      eventDate: dates[0]?.value ? `${dates[0].value}T10:00:00` : null,
      endDate: dates[3]?.value ? `${dates[3].value}T18:00:00` : null,
      status: "UPCOMING",
    };
  }

  mapCategoryToEventType(category) {
    const map = {
      "Academic Project": "CAPSTONE",
      "Social Event": "EVENT",
      Workshop: "WORKSHOP",
    };
    return map[category] || "CAPSTONE";
  }

  mapVisibilityToRoute(visibility) {
    const map = {
      Public: "BASIC",
      Private: "ADVANCED",
      "Internal Only": "BASIC",
    };
    return map[visibility] || "BASIC";
  }

  validateForm() {
    const data = this.getFormData();
    if (!data.title.trim()) {
      return "Event title is required";
    }
    if (!data.description.trim()) {
      return "Description is required";
    }
    return null;
  }

  showError(message) {
    const container = document.querySelector(".container.py-3");
    const existingAlert = container?.querySelector(".alert");
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement("div");
    alert.className = "alert alert-danger rounded-4 mb-4";
    alert.textContent = message;
    container?.insertBefore(alert, container.firstChild);
  }

  showSuccess(message) {
    const container = document.querySelector(".container.py-3");
    const existingAlert = container?.querySelector(".alert");
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement("div");
    alert.className = "alert alert-success rounded-4 mb-4";
    alert.textContent = message;
    container?.insertBefore(alert, container.firstChild);
  }

  setLoading(isLoading) {
    const submitBtn = document.getElementById("submit-event-btn");
    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.innerHTML = isLoading
        ? `<span class="ce-spinner"></span>`
        : "Create Event";
    }
  }

  clearForm() {
    const inputs = document.querySelectorAll(".app-input");
    inputs.forEach((input) => (input.value = ""));
    const dates = document.querySelectorAll('input[type="date"]');
    dates.forEach((input) => (input.value = ""));
  }

  async handleSubmit(e) {
    e.preventDefault();

    const validationError = this.validateForm();
    if (validationError) {
      this.showError(validationError);
      return;
    }

    this.setLoading(true);
    this.error = null;

    try {
      const data = this.getFormData();
      await createEvent(data);

      this.showSuccess("Event created successfully!");
      this.clearForm();

      setTimeout(() => {
        this.router.navigate("events");
      }, 1500);
    } catch (err) {
      console.error("Failed to create event:", err);
      this.showError(
        err.message || "Failed to create event. Please try again.",
      );
    } finally {
      this.setLoading(false);
    }
  }

  async render() {
    const app = document.getElementById("app");

    const mainContent = await fetch(`../../pages/create_dashboard.html`).then(
      (r) => r.text(),
    );

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
      <main class="dashboard-main">
        ${mainContent}
      </main>
    `;

    this.header.mountBreadcrumb();
    this.header.attachEventHandlers();
    this.navbar.attachEventHandlers();
    this.attachEventHandlers();
  }

  attachEventHandlers() {
    const existingForm = document.querySelector("form");
    if (existingForm) {
      existingForm.addEventListener("submit", (e) => this.handleSubmit(e));
      return;
    }

    const container = document.querySelector(".container.py-3");
    if (!container) return;

    const submitBtn = document.createElement("button");
    submitBtn.id = "submit-event-btn";
    submitBtn.type = "submit";
    submitBtn.className = "btn btn-primary w-100 mt-4 py-3";
    submitBtn.textContent = "Create Event";

    const form = document.createElement("form");
    form.id = "create-event-form";

    const existingSection = container.querySelector(
      ".app-section:last-of-type",
    );
    if (existingSection) {
      existingSection.after(submitBtn);
      submitBtn.addEventListener("click", (e) => this.handleSubmit(e));
    }
  }
}
