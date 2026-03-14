import "../assets/styles/voting.css";
import { submitVote, getPublicEvent } from "../services/api.js";
import { getEventRanking } from "../services/api-events.js";

export default class PublicVotingPage {
  constructor(app, params) {
    this.app     = app;
    this.params  = params;
    this.eventId = params?.eventId; 
    this.event   = null;
    this.ranking = [];
  }

  /* -------------------------- FETCH -------------------------- */

  async fetchEvent() {
    try {
      if (!this.eventId) {
        console.error("No eventId found");
        return;
      }
      this.event = await getPublicEvent(this.eventId);
    } catch (error) {
      console.error("Error loading event", error);
    }
  }

  async fetchRanking() {
    try {
      const res    = await getEventRanking(this.eventId); 
      this.ranking = res?.data?.ranking || [];            
    } catch (error) {
      console.error("Error loading ranking", error);
      this.ranking = [];
    }
  }

  /* -------------------------- VOTING -------------------------- */

  async handleVote(teamId) {
    try {
      await submitVote({ eventId: this.eventId, teamId });

      localStorage.setItem(`voted_event_${this.eventId}`, "true");
      alert("Vote registered successfully!");
      this.disableVoting();

    } catch (error) {
      console.error("Vote error:", error);
      alert("Error submitting vote");
    }
  }

  disableVoting() {
    document.querySelectorAll(".vote-btn").forEach(btn => btn.disabled = true);
  }

  /* -------------------------- RENDER -------------------------- */

  renderFinalists() {
    if (!this.ranking.length) {
      return `<p style="text-align:center;color:#64748b;">No teams available yet.</p>`;
    }

    return this.ranking.map(team => `
      <div class="team-card">
        <h3>${team.team_name}</h3>
        <p>${team.project_name || ""}</p>
        <button class="vote-btn" data-team="${team.id_team}">Vote</button>
      </div>
    `).join("");
  }

  attachEvents() {
    document.querySelectorAll(".vote-btn").forEach(btn => {
      btn.addEventListener("click", () => this.handleVote(btn.dataset.team));
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
          <h1>${this.event.name}</h1>
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
  }
}