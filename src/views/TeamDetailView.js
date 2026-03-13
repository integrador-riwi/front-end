import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import { apiFetch } from "../services/api.js";
import {
  renderCoderTeam,
  loadComments,
  initDeliverables,
} from "./coderTeam.js";

export default class TeamDetailView {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.teamId = params.teamId;
    this.commentsCleanup = null;
  }

  _isAdmin() {
    return this.user?.role === "ADMIN";
  }

  async render() {
    if (!this._isAdmin()) {
      this.router.navigate("projects");
      return;
    }

    const app = document.getElementById("app");

    app.innerHTML = `
      ${this.navbar.render()}
      <div style="display:flex;flex-direction:column;width:100%">
        ${this.header.render()}
        <main class="coder-home-main" id="teamDetailMain">
          <div class="container-xl px-3 px-md-4 py-4">
            <div style="height:220px;border-radius:16px;
                        background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
                        background-size:800px 100%;animation:shimmer 1.4s infinite;"></div>
          </div>
        </main>
      </div>`;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();
    this._injectShimmer();

    await this._loadAndRender();
  }

  async _loadAndRender() {
    const main = document.getElementById("teamDetailMain");

    try {
      const res = await apiFetch(`/teams/${this.teamId}`, { method: "GET" });
      const data = res?.data ?? res;

      const team = {
        id_team:  data.id_team,
        name:     data.name,
        id_event: data.id_event,
        members:  data.members ?? [],
        project:  data.project ?? null,
      };

      // isTL: false → no carga el panel de evaluación
      // isLeader: false → no muestra botones de edición ni leave team
      const html = renderCoderTeam({
        user:          this.user,
        team,
        isLeader:      false,
        isTL:          false,
        selectedEvent: null,
      });

      main.innerHTML = `
        <div style="padding:1.25rem 1.5rem 0;">
          <button class="td-back-btn" id="tdBackBtn">
            <span class="material-icons-round" style="font-size:1.1rem;vertical-align:middle;">arrow_back</span>
            Volver a equipos
          </button>
        </div>
        ${html}`;

      // Ocultar el botón "Leave Team" que renderCoderTeam puede inyectar
      // cuando isSubmitted es false (por si acaso)
      document.getElementById("leaveTeamBtn")?.remove();

      const projectId = team.project?.id_project ?? null;

      setTimeout(() => {
        if (projectId) {
          if (this.commentsCleanup) this.commentsCleanup();
          this.commentsCleanup = loadComments(projectId, this.user);
          initDeliverables(projectId);
        }
      }, 0);

      document.getElementById("tdBackBtn")
          ?.addEventListener("click", () => this.router.navigate("projects"));

    } catch (err) {
      console.error("TeamDetailView error:", err);
      main.innerHTML = `
        <div class="container-xl px-3 px-md-4 py-4">
          <div class="bg-white rounded-4 p-5 ct-card-shadow text-center">
            <span class="material-icons-round" style="font-size:2.5rem;color:var(--text-muted);">error_outline</span>
            <p class="mt-3" style="color:var(--text-muted);">No se pudo cargar el equipo. Intenta de nuevo.</p>
            <button class="ct-btn-post mt-2" id="tdBackBtn">Volver a equipos</button>
          </div>
        </div>`;
      document.getElementById("tdBackBtn")
          ?.addEventListener("click", () => this.router.navigate("projects"));
    }
  }

  _injectShimmer() {
    if (document.getElementById("td-shimmer-kf")) return;
    const s = document.createElement("style");
    s.id = "td-shimmer-kf";
    s.textContent = `
      @keyframes shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position:  400px 0; }
      }
      .td-back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: none;
        border: none;
        color: var(--color-primary, #6366f1);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        margin-bottom: 0.5rem;
        transition: opacity .2s;
      }
      .td-back-btn:hover { opacity: .65; }
    `;
    document.head.appendChild(s);
  }
}
