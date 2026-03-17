import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { t, onLangChange } from "../utils/i18n.js";
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
  }

  async render() {
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
    this.header.attachEventHandlers();
    this.navbar.attachEventHandlers();
    this._injectShimmer();

    await this._loadAndRender();

    this._offLangChange = onLangChange(() => this._loadAndRender());
  }

  async _loadAndRender() {
    const main = document.getElementById("teamDetailMain");

    try {
      const res = await apiFetch(`/teams/${this.teamId}`, { method: "GET" });
      const data = res?.data ?? res;

      const team = {
        id_team: data.id_team,
        name: data.name,
        id_event: data.id_event,
        members: data.members ?? [],
        project: data.project ?? null,
      };

      const html = renderCoderTeam({
        user: this.user,
        team,
        isLeader: false,
        isTL: false,
        selectedEvent: null,
      });

      main.innerHTML = html;

      // Quitar botón leave team por si acaso
      document.getElementById("leaveTeamBtn")?.remove();

      const projectId = team.project?.id_project ?? null;

      setTimeout(() => {
        if (projectId) {
          loadComments(projectId, this.user);
          initDeliverables(projectId);
        }
      }, 0);
    } catch (err) {
      console.error("TeamDetailView error:", err);
      main.innerHTML = `
        <div class="container-xl px-3 px-md-4 py-4">
          <div class="bg-white rounded-4 p-5 ct-card-shadow text-center">
            <span class="material-icons-round" style="font-size:2.5rem;color:var(--text-muted);">error_outline</span>
            <p class="mt-3" style="color:var(--text-muted);">${t("teamsProjects.loadError")}</p>
          </div>
        </div>`;
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
    `;
    document.head.appendChild(s);
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
