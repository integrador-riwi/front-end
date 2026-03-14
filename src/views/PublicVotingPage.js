import "../assets/styles/voting.css";
import { getEventById, submitVote } from "../services/api.js";
import { getEventRanking } from "../services/api-events.js";
import { t, onLangChange } from "../utils/i18n.js";

export default class PublicVotingPage {
  constructor(app, params) {
    this.app = app;
    this.eventId = params.eventId;
    this._offLangChange = null;
  }

  async fetchEvent() {
    const res = await getEventById(this.eventId);
    this.event = res.data;
  }

  async fetchRanking() {
    const res = await getEventRanking(this.eventId);
    this.ranking = res.data;
  }

  async handleVote(teamId) {
    try {
      await submitVote({
        eventId: this.eventId,
        teamId,
      });

      localStorage.setItem(`voted_event_${this.eventId}`, "true");

      alert(t("publicVoting.voteSuccess"));
      this.disableVoting();
    } catch (error) {
      console.error("Vote error:", error);
      alert(t("publicVoting.voteError"));
    }
  }

  disableVoting() {
    const buttons = document.querySelectorAll(".vote-btn");
    buttons.forEach((btn) => (btn.disabled = true));
  }

  renderFinalists() {
    return this.ranking
      .map(
        (team) => `
      <div class="team-card">
        <h3>${team.team_name}</h3>
        <p>${team.project_name || ""}</p>

        <button class="vote-btn" data-team="${team.id_team}">
          ${t("publicVoting.voteBtn")}
        </button>
      </div>
    `,
      )
      .join("");
  }

  attachEvents() {
    const buttons = document.querySelectorAll(".vote-btn");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const teamId = btn.dataset.team;
        this.handleVote(teamId);
      });
    });
  }

  async render(container) {
    await this.fetchEvent();
    await this.fetchRanking();

    container.innerHTML = `
      <div class="vote-page">

        <header class="vote-header">
          <h1>${this.event.name}</h1>
          <p>${t("publicVoting.voteForBest")}</p>
        </header>

        <section class="finalists-list">
          ${this.renderFinalists()}
        </section>

      </div>
    `;

    if (localStorage.getItem(`voted_event_${this.eventId}`)) {
      this.disableVoting();
    }

    this.attachEvents();
    this._offLangChange = onLangChange(() => this.render(container));
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
