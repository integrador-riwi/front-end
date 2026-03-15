import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventFinalists } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import { getSelectedEvent } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/finalists.css";

export default class FinalistsView {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.finalists = [];
  }

  /* -------------------------- FETCH -------------------------- */

  async fetchFinalists() {
    try {
      const eventId = getSelectedEvent();
      const response = await getEventFinalists(eventId);
      this.finalists = response?.finalists ?? response ?? [];
    } catch (err) {
      console.error("Failed to fetch finalists:", err);
      this.finalists = [];
    }
  }

  /* -------------------------- RENDER PODIUM -------------------------- */

  renderPodium() {
    if (!this.finalists.length) {
      return `
        <div class="text-center py-5" style="color:#7b7fa8;">
          <p class="fw-bold mb-0">No finalists yet</p>
          <p style="font-size:0.85rem;">Finalists will appear here once approved</p>
        </div>`;
    }

    const first = this.finalists[0] ?? null;
    const second = this.finalists[1] ?? null;
    const third = this.finalists[2] ?? null;

    const avatarEl = (team, position) => {
      if (!team) return "";
      const hasPhoto =
        team.preview_photo_url && !team.preview_photo_url.endsWith("#");
      return hasPhoto
        ? `<img src="${team.preview_photo_url}"
            class="podium-avatar podium-avatar-${position}"
            alt="${team.team_name}"/>`
        : `<div class="podium-avatar-initial podium-avatar-initial-${position}">
         ${team.team_name?.[0]?.toUpperCase() ?? "?"}
       </div>`;
    };

    return `
      <div class="podium-container d-flex align-items-end justify-content-center gap-3 gap-md-4 w-100">

    <!-- 2nd Place -->
    ${
      second
        ? `
    <div class="podium-col podium-col-2nd d-flex flex-column align-items-center">
      <div class="text-center mb-3">
        ${avatarEl(second, "2nd")}
        <h4 class="fw-bold mt-2 mb-0 podium-team-name-2nd">${second.team_name}</h4>
        <p class="mb-0 podium-project-name">${second.name}</p>
        <p class="mb-0 podium-description">${second.description}</p>
      </div>
      <div class="podium-block podium-block-2nd w-100 position-relative">
        <div class="podium-medal podium-medal-2nd">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:22px;">military_tech</span>
        </div>
        <div class="text-center mt-3">
          <div class="podium-number podium-number-2nd">2</div>
          <div class="podium-label podium-label-2nd">Silver</div>
        </div>
        <div class="text-center">
          <div class="podium-sublabel">Finalist</div>
        </div>
      </div>
    </div>`
        : ""
    }

    <!-- 1st Place -->
    ${
      first
        ? `
    <div class="podium-col podium-col-1st d-flex flex-column align-items-center">
      <div class="text-center mb-4 position-relative">
        <div class="position-relative d-inline-block">
          ${avatarEl(first, "1st")}
          <span class="material-symbols-outlined podium-stars">stars</span>
        </div>
        <h4 class="fw-black mt-2 mb-0 podium-team-name-1st">${first.team_name}</h4>
        <p class="mb-0 podium-description-1st">${first.name}</p>
        <p class="mb-0 podium-description">${first.description}</p>
      </div>
      <div class="podium-block podium-block-1st w-100 position-relative">
        <div class="podium-medal podium-medal-1st">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:28px;">emoji_events</span>
        </div>
        <div class="text-center mt-4">
          <div class="podium-number podium-number-1st">1</div>
          <div class="podium-label podium-label-1st">Winner</div>
        </div>
        <div class="text-center">
          <div class="podium-sublabel">🏆 Champion</div>
        </div>
      </div>
    </div>`
        : ""
    }

    <!-- 3rd Place -->
    ${
      third
        ? `
    <div class="podium-col podium-col-3rd d-flex flex-column align-items-center">
      <div class="text-center mb-3">
        ${avatarEl(third, "3rd")}
        <h4 class="fw-bold mt-2 mb-0 podium-team-name-3rd">${third.team_name}</h4>
        <p class="mb-0 podium-project-name">${third.name}</p>
        <p class="mb-0 podium-description">${third.description}</p>
      </div>
      <div class="podium-block podium-block-3rd w-100 position-relative">
        <div class="podium-medal podium-medal-3rd">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:22px;">workspace_premium</span>
        </div>
        <div class="text-center mt-2">
          <div class="podium-number podium-number-3rd">3</div>
          <div class="podium-label podium-label-3rd">Bronze</div>
        </div>
        <div class="text-center">
          <div class="podium-sublabel">Finalist</div>
        </div>
      </div>
    </div>`
        : ""
    }

  </div>
    `;
  }

  /* -------------------------- MAIN RENDER -------------------------- */

  async render() {
    const app = document.getElementById("app");

    app.innerHTML = `
      ${this.navbar.render()}
      <div style="display:flex;flex-direction:column;width:100%;">
        ${this.header.render()}
        <main class="dashboard-main">
          <div class="container-fluid py-4">

            <!-- Podium -->
            <div id="podium-container" class="d-flex justify-content-center mb-5">
              <div class="d-flex align-items-center justify-content-center py-5">
                <div class="spinner-border" style="color:#6b5cff;"></div>
              </div>
            </div>

          </div>
        </main>
      </div>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    await this.fetchFinalists();

    document.getElementById("podium-container").innerHTML = this.renderPodium();
  }
}
