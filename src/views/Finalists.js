import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventFinalists } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import { getSelectedEvent } from "../utils/helpers.js";
import { t, onLangChange } from "../utils/i18n.js";
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

      // MOCK DATA FOR REVIEW (Added per user request)
      if (this.finalists.length === 0) {
        this.finalists = [
          { team_name: "Code Crafters", project_name: "AI Personal Assistant", second_grade: 1.2, votes_result: 0.5, final_grade: 1.7 },
          { team_name: "Pixel Perfect", project_name: "E-commerce Redesign", second_grade: 2.5, votes_result: 1.1, final_grade: 3.6 },
          { team_name: "Data Wizards", project_name: "Real-time Crypto Tracker", second_grade: 3.8, votes_result: 2.0, final_grade: 5.8 }
        ];
      }
    } catch (err) {
      console.error("Failed to fetch finalists:", err);
      // MOCK DATA ON ERROR
      this.finalists = [
        { team_name: "Code Crafters", project_name: "AI Personal Assistant", second_grade: 1.2, votes_result: 0.5, final_grade: 1.7 },
        { team_name: "Pixel Perfect", project_name: "E-commerce Redesign", second_grade: 2.5, votes_result: 1.1, final_grade: 3.6 },
        { team_name: "Data Wizards", project_name: "Real-time Crypto Tracker", second_grade: 3.8, votes_result: 2.0, final_grade: 5.8 }
      ];
    }
  }

  /* -------------------------- RENDER PODIUM -------------------------- */

  renderPodium() {
    if (!this.finalists.length) {
      return `
        <div class="text-center py-5" style="color:#7b7fa8;">
          <span class="material-symbols-outlined d-block mb-2" style="font-size:3rem;opacity:0.3;">emoji_events</span>
          <p class="fw-bold mb-1" style="font-size:1.2rem;">${t('finalists.noFinalists')}</p>
          <p style="font-size:0.95rem;">${t('finalists.noFinalistsDesc')}</p>
        </div>`;
    }

    const first  = this.finalists[0] ?? null;
    const second = this.finalists[1] ?? null;
    const third  = this.finalists[2] ?? null;

    const avatarEl = (team, pos) => {
      if (!team) return "";
      const initial = team.team_name?.[0]?.toUpperCase() ?? "?";
      const medalIcon = pos === '1st' ? 'emoji_events' : (pos === '2nd' ? 'military_tech' : 'workspace_premium');
      
      return `
        <div class="podium-avatar-wrap">
          <div class="podium-seed podium-seed-${pos}"></div>
          <div class="podium-avatar-initial podium-avatar-initial-${pos}">
            ${initial}
          </div>
          <div class="podium-avatar-badge podium-avatar-badge-${pos}">
            <span class="material-symbols-outlined">${medalIcon}</span>
          </div>
          ${pos === '1st' ? `
            <div class="podium-stars-top">
              <span class="material-symbols-outlined">star</span>
            </div>
          ` : ''}
        </div>`;
    };

    const scoreBreakdown = (team) => {
      const nota  = team.second_grade != null ? Number(team.second_grade).toFixed(2) : '0.00';
      const votos = team.votes_result != null ? Number(team.votes_result).toFixed(2) : '0.00';
      const final = team.final_grade  != null ? Number(team.final_grade).toFixed(2)  : '0.00';
      
      return `
        <div class="podium-scores">
          <div class="podium-score-item">
            <span class="podium-score-label">${t('finalists.score')}</span>
            <span class="podium-score-value">${nota}</span>
          </div>
          <div class="podium-score-item">
            <span class="podium-score-label">${t('finalists.votes')}</span>
            <span class="podium-score-value">${votos}</span>
          </div>
          <div class="podium-score-total">
            <div class="podium-score-item mb-0">
               <span class="podium-score-label">${t('finalists.total')}</span>
               <span class="podium-score-value">${final}</span>
            </div>
            <p class="podium-score-hint">${t('finalists.lowerBetter')}</p>
          </div>
        </div>`;
    };

    const podiumCard = (team, pos, rank, rankLabel, order) => {
      if (!team) return '';
      const footerBadgeIcon = pos === '1st' ? 'award_star' : 'verified';
      const footerBadgeText = pos === '1st' ? t('finalists.champion') : t('finalists.finalist');
      const badgeClass = pos === '1st' ? 'badge-1st' : 'badge-others';

      return `
        <div class="podium-col podium-col-${pos}" style="order:${order};">
          ${avatarEl(team, pos)}
          <h4 class="podium-team-name podium-team-name-${pos}">${team.team_name}</h4>
          <p class="podium-project-name">${team.project_name ?? team.name ?? t('finalists.untitledProject')}</p>
          
          <div class="podium-card podium-card-${pos}">
            <div class="podium-rank-display">
              <div class="podium-rank-number">${rank}</div>
              <div class="podium-rank-label podium-rank-label-${pos}">${rankLabel}</div>
            </div>
            
            ${scoreBreakdown(team)}

            <div class="podium-footer-badge ${badgeClass}">
               <span class="material-symbols-outlined">${footerBadgeIcon}</span>
               ${footerBadgeText}
            </div>
          </div>
        </div>`;
    };

    return `
      <div class="podium-row">
        ${podiumCard(second, '2nd', '2', t('finalists.silver'), 0)}
        ${podiumCard(first,  '1st', '1', t('finalists.winner'), 1)}
        ${podiumCard(third,  '3rd', '3', t('finalists.bronze'), 2)}
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
                <p class="text-muted fw-medium">${t('finalists.loading')}</p>
              </div>
            </div>

          </div>
        </main>
      </div>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();
    
    this._offLangChange = onLangChange(() => this.render());

    await this.fetchFinalists();

    document.getElementById("podium-container").innerHTML = this.renderPodium();
  }
  
  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
