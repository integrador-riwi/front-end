import "../assets/styles/voting.css";
import { submitVote, getVotingProjects } from "../services/api.js";
import { getEventRanking } from "../services/api-events.js";
import { t, onLangChange } from "../utils/i18n.js";

export default class PublicVotingPage {
  constructor(app, params) {
    this.app = app;
    this.eventId = params.eventId;
    this._offLangChange = null;
    this.event = null;
    this.ranking = [];
  }

  /* -------------------------- FETCH -------------------------- */

  async fetchEvent() {
    try {
      if (!this.eventId) {
        console.error("No eventId found");
        return;
      }
      const eventPath = window.location.pathname.split('/')
      this.event = eventPath[eventPath.length - 1]

    } catch (error) {
      console.error("Error loading event", error);
    }
  }

  async fetchRanking() {
    try {
      const res    = await getVotingProjects(this.eventId); 
      this.ranking = res?.projects || [];     
      const qrVoteId = res.qr_vote_id;
      console.log(qrVoteId)
      sessionStorage.setItem("qrVoteId",JSON.stringify(qrVoteId));
    } catch (error) {
      console.error("Error loading ranking", error);
      this.ranking = [];
    }
  }

  /* -------------------------- VOTING -------------------------- */

  async handleVote(projectId) {
    try {
        const qrVoteId = JSON.parse(sessionStorage.getItem("qrVoteId"))
        console.log(qrVoteId)
        console.log(projectId)
        console.log({ qr_vote_id:qrVoteId, project_id: Number(projectId)})
      await submitVote(qrVoteId, Number(projectId));

      sessionStorage.setItem(`voted_event_${this.projectId}`, "true");
      alert("Vote registered successfully!");
      this.disableVoting();

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

  /* -------------------------- RENDER -------------------------- */

  renderFinalists() {
    if (!this.ranking.length) {
      return `<p style="text-align:center;color:#64748b;">${t("publicVoting.noTeams") || "No teams available yet."}</p>`;
    }

    return this.ranking
      .map(
        (team) => `
      <div class="team-card">
        <h3>${team.team_name}</h3>
        <p>${team.project_name || ""}</p>
        <button class="vote-btn" data-team="${team.id_project}">Vote</button>
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

    if (!this.event) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px;">
          <h2>Event not found</h2>
          <p>The event you're looking for doesn't exist or is no longer available.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="vote-page">
        <header class="vote-header">
          <h1>TeamUp Voting</h1>
          <p>Vote for the best project</p>
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
