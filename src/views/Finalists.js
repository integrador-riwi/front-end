import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventFinalists } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import { getSelectedEvent } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/finalists.css";
import { icons } from "../utils/icons.js";

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

      console.log("raw response:", JSON.stringify(response, null, 2));
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

    const first  = this.finalists[0] ?? null;
    const second = this.finalists[1] ?? null;
    const third  = this.finalists[2] ?? null;

    const avatarEl = (team, position) => {
      if (!team) return "";
      return `<div class="podium-avatar-initial podium-avatar-initial-${position}">
      ${team.team_name?.[0]?.toUpperCase() ?? "?"}
    </div>`;
    };

    const podiumCard = (team, position, config) => {
      if (!team) return '';
      return `
      <div class="col-12 col-md-4 d-flex flex-column align-items-center
                  ${position === '1st' ? 'order-md-2' : position === '2nd' ? 'order-md-1' : 'order-md-3'}">

        <!-- Team info above podium -->
        <div class="text-center mb-3 ${position === '1st' ? 'mb-md-4' : ''}">
          ${position === '1st' ? `
          <div class="position-relative d-inline-block">
            ${avatarEl(team, position)}
            <span class="material-symbols-outlined podium-stars">stars</span>
          </div>` : avatarEl(team, position)}
          <h4 class="mt-2 mb-0 ${config.nameClass}">${team.team_name}</h4>
          <p class="mb-0 podium-project-name">${team.project_name ?? team.name ?? ''}</p>
        </div>

        <!-- Podium block -->
        <div class="podium-block ${config.blockClass} w-100 position-relative">
          <div class="podium-medal ${config.medalClass}">
            <span class="material-symbols-outlined"
                  style="font-variation-settings:'FILL' 1;font-size:${position === '1st' ? '28' : '22'}px;">
              ${config.medalIcon}
            </span>
          </div>
          <div class="text-center mt-${position === '1st' ? '4' : '3'}">
            <div class="podium-number ${config.numberClass}">${config.rank}</div>
            <div class="podium-label ${config.labelClass}">${config.rankLabel}</div>
          </div>
          <div class="text-center mt-2">
            <div class="podium-sublabel">
              <span class="icon-md">${position === '1st' ? icons.trophy() : icons.check()}</span>
              ${position === '1st' ? 'Champion' : 'Finalist'}
            </div>
          </div>
        </div>

      </div>
    `;
    };

    return `
    <div class="row g-4 align-items-end w-100" style="max-width:900px;margin:0 auto;">

      ${podiumCard(first, '1st', {
      nameClass:  'fw-black podium-team-name-1st',
      blockClass: 'podium-block-1st',
      medalClass: 'podium-medal-1st',
      medalIcon:  'emoji_events',
      numberClass:'podium-number-1st',
      labelClass: 'podium-label-1st',
      rank:       '1',
      rankLabel:  'Winner',
    })}

      ${podiumCard(second, '2nd', {
      nameClass:  'fw-bold podium-team-name-2nd',
      blockClass: 'podium-block-2nd',
      medalClass: 'podium-medal-2nd',
      medalIcon:  'military_tech',
      numberClass:'podium-number-2nd',
      labelClass: 'podium-label-2nd',
      rank:       '2',
      rankLabel:  'Silver',
    })}

      ${podiumCard(third, '3rd', {
      nameClass:  'fw-bold podium-team-name-3rd',
      blockClass: 'podium-block-3rd',
      medalClass: 'podium-medal-3rd',
      medalIcon:  'workspace_premium',
      numberClass:'podium-number-3rd',
      labelClass: 'podium-label-3rd',
      rank:       '3',
      rankLabel:  'Bronze',
    })}

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
            <div id="podium-container">
              <div class="d-flex flex-column align-items-center justify-content-center" style="height: 60vh; gap: 16px;">
                <div class="ce-spinner" style="width: 40px; height: 40px; border-width: 4px; border-color: rgba(107,92,255,0.2); border-top-color: var(--color-primary, #6b5cff);"></div>
                <p class="text-muted fw-medium">Loading Finalists...</p>
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