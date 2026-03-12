import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import { apiFetch } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";

export default class DashboardView {
  constructor(router, params) {
    this.router = router;
    this.user = getUser();
    this.eventId = params?.id ?? localStorage.getItem("currentEventId");
    this.eventName =
      params?.name ?? localStorage.getItem("currentEventName") ?? "Dashboard";
    this.navbar = new Navbar(router);
    this.header = new Header(router, { eventName: this.eventName });
    this.metrics = null;
    this.loading = true;
    this.error = null;
  }

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0">
        ${this.header.render()}
        <main class="dashboard-main">
          <div id="db-root"></div>
        </main>
      </div>
    `;
    this.navbar.attachEventHandlers();
    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();

    await this._loadMetrics();
  }

  async _loadMetrics() {
    this.loading = true;
    this._paint();
    try {
      const res = await apiFetch(`/events/${this.eventId}/metrics`, {
        method: "GET",
      });
      this.metrics = res?.data ?? null;
    } catch (e) {
      this.error = e.message ?? "Error loading metrics.";
      toast.error('Error', this.error);
    }
    this.loading = false;
    this._paint();
  }

  _paint() {
    const root = document.getElementById("db-root");
    if (!root) return;
    root.innerHTML = this._html();
  }

  _html() {
    if (this.loading) {
      return `<div class="rk-loading"><span class="rk-spinner rk-spinner--lg"></span><p>Cargando métricas...</p></div>`;
    }
    if (this.error) {
      return `<div class="rk-alert rk-alert--error" style="margin:24px">${this.error}</div>`;
    }
    if (!this.metrics) return "";

    const m = this.metrics;

    const cards = [
      { label: "Teams", value: m.totalTeams, icon: "👥" },
      { label: "Projects", value: m.totalProjects, icon: "📁" },
      { label: "Coders", value: m.totalCoders, icon: "💻" },
      { label: "Votes", value: m.totalVotes, icon: "🗳️" },
      {
        label: "Evaluated",
        value: `${m.evaluatedProjects}/${m.totalProjects}`,
        icon: "✅",
      },
      { label: "Areas", value: m.activeAreas, icon: "📐" },
    ];

    return `
      <div class="db-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;padding:24px">
        ${cards
          .map(
            (c) => `
          <div class="app-section db-card" style="display:flex;flex-direction:column;gap:8px;padding:20px 24px">
            <span style="font-size:28px">${c.icon}</span>
            <span class="db-card-value" style="font-size:2rem;font-weight:700;color:var(--primary,#6c63ff);line-height:1">${c.value}</span>
            <span style="font-size:.8rem;color:var(--text-muted,#888);font-weight:500;text-transform:uppercase;letter-spacing:.05em">${c.label}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }
}
