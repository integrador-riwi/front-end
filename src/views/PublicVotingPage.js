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

  async render(container) {
    // ✅ Si no pasan container usa el elemento #app del DOM
    const target = container instanceof HTMLElement
      ? container
      : document.getElementById("app");

    await this.fetchEvent();
    await this.fetchRanking();

    if (!this.event) {
      target.innerHTML = `
        <div style="text-align:center;padding:48px;">
          <h2>Event not found</h2>
          <p>The event you're looking for doesn't exist or is no longer available.</p>
        </div>`;
      return;
    }

    target.innerHTML = `
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