import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventFinalists } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import { getSelectedEvent } from "../utils/helpers.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/finalists.css";
import { icons } from "../utils/icons.js";
import { t, onLangChange } from "../utils/i18n.js";

export default class FinalistsView {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.finalists = [];
    this._offLangChange = onLangChange(() => this.render());
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
          <span class="material-symbols-outlined d-block mb-2" style="font-size:2.5rem;opacity:0.4;">emoji_events</span>
          <p class="fw-bold mb-1">${t("finalistsPage.noFinalists")}</p>
          <p style="font-size:0.85rem;">${t("finalistsPage.noFinalistsDesc")}</p>
        </div>`;
    }

    const first  = this.finalists[0] ?? null;
    const second = this.finalists[1] ?? null;
    const third  = this.finalists[2] ?? null;

    const avatarEl = (team, pos) => {
      if (!team) return "";
      return `
        <div class="podium-avatar-wrap">
          <div class="podium-avatar-initial podium-avatar-initial-${pos}">
            ${team.team_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          ${pos === '1st' ? '<span class="material-symbols-outlined podium-stars">stars</span>' : ''}
        </div>`;
    };

    const scoreBreakdown = (team) => {
      const nota  = team.second_grade != null ? Number(team.second_grade).toFixed(2) : '—';
      const votos = team.votes_result != null ? Number(team.votes_result).toFixed(2) : '—';
      const final = team.final_grade  != null ? Number(team.final_grade).toFixed(2)  : '—';
      return `
        <div class="podium-score-breakdown">
          <div class="podium-score-row">
            <span class="podium-score-label">${t("finalistsPage.score")}</span>
            <span class="podium-score-val">${nota}</span>
          </div>
          <div class="podium-score-row">
            <span class="podium-score-label">${t("finalistsPage.votes")}</span>
            <span class="podium-score-val">${votos}</span>
          </div>
          <div class="podium-score-divider"></div>
          <div class="podium-score-row podium-score-total">
            <span class="podium-score-label">${t("finalistsPage.total")}</span>
            <span class="podium-score-val">${final}</span>
          </div>
          <p class="podium-score-hint">${t("finalistsPage.lowerBetter")}</p>
        </div>`;
    };

    const podiumCard = (team, pos, blockClass, medalClass, numberClass, labelClass, rank, rankLabel, medalIcon, order) => {
      if (!team) return '';
      return `
        <div class="podium-col podium-col-${pos}" style="order:${order};">
          ${avatarEl(team, pos)}
          <h4 class="mt-2 mb-0 fw-bold podium-team-name-${pos}">${team.team_name}</h4>
          <p class="mb-3 podium-project-name">${team.project_name ?? team.name ?? ''}</p>
          <div class="podium-block ${blockClass} w-100 position-relative">
            <div class="podium-medal ${medalClass}">
              <span class="material-symbols-outlined"
                    style="font-variation-settings:'FILL' 1;font-size:${pos === '1st' ? '22' : '18'}px;">
                ${medalIcon}
              </span>
            </div>
            <div class="text-center mb-2">
              <div class="podium-number ${numberClass}">${rank}</div>
              <div class="podium-label ${labelClass}">${rankLabel}</div>
            </div>
            ${scoreBreakdown(team)}
            <div class="podium-sublabel justify-content-center">
              <span class="icon-md">${pos === '1st' ? icons.trophy() : icons.check()}</span>
              ${pos === '1st' ? t("finalistsPage.champion") : t("finalistsPage.finalist")}
            </div>
          </div>
        </div>`;
    };

    return `
      <div class="podium-row">
        ${podiumCard(second, '2nd', 'podium-block-2nd', 'podium-medal-2nd', 'podium-number-2nd', 'podium-label-2nd', '2', t("finalistsPage.silver"),   'military_tech',       0)}
        ${podiumCard(first,  '1st', 'podium-block-1st', 'podium-medal-1st', 'podium-number-1st', 'podium-label-1st', '1', t("finalistsPage.winner"),   'emoji_events',        1)}
        ${podiumCard(third,  '3rd', 'podium-block-3rd', 'podium-medal-3rd', 'podium-number-3rd', 'podium-label-3rd', '3', t("finalistsPage.bronze"),   'workspace_premium',   2)}
      </div>`;
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
            <div id="podium-container" class="finalists-page">
              <div class="d-flex flex-column align-items-center justify-content-center" style="height: 60vh; gap: 16px;">
                <div class="ce-spinner" style="width: 40px; height: 40px; border-width: 4px; border-color: rgba(107,92,255,0.2); border-top-color: var(--color-primary, #6b5cff);"></div>
                <p class="text-muted fw-medium">${t("finalistsPage.loading")}</p>
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

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
