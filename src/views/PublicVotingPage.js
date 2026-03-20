import "../assets/styles/voting.css";
import { submitVote, getVotingProjects, getStaffVotingProjects } from "../services/api.js";
import { getEventRanking } from "../services/api-events.js";
import { t, onLangChange } from "../utils/i18n.js";

export default class PublicVotingPage {
  constructor(app, params) {
    this.app = app;
    this.eventId = params.eventId;
    this.staffToken = params.staffToken ?? null;
    this.isStaff = params.isStaff ?? !!this.staffToken;
    this._offLangChange = null;
    this.event = null;
    this.ranking = [];
    this.qrVoteId = null;
  }

  /* -------------------------- FETCH -------------------------- */

  async fetchEvent() {
    try {
      if (!this.isStaff && !this.eventId) {
        console.error("No eventId found");
        return;
      }
      const eventPath = window.location.pathname.split("/");
      this.event = eventPath[eventPath.length - 1];
    } catch (error) {
      console.error("Error loading event", error);
    }
  }

  async fetchRanking() {
    try {
      let res;

      if (this.isStaff) {
        // Staff: usa el token privado de la URL
        res = await getStaffVotingProjects(this.staffToken);
      } else {
        res = await getVotingProjects(this.eventId);
      }

      this.ranking = res?.projects || [];
      this.qrVoteId = res?.qr_vote_id;
      sessionStorage.setItem("qrVoteId", JSON.stringify(this.qrVoteId));

      // Token único por sesión — usa staffToken o eventId como clave
      const tokenKey = this.isStaff
        ? `voter_token_staff_${this.staffToken}`
        : `voter_token_${this.eventId}`;

      if (!localStorage.getItem(tokenKey)) {
        localStorage.setItem(tokenKey, crypto.randomUUID());
      }
    } catch (error) {
      console.error("Error loading ranking", error);
      this.ranking = [];
    }
  }

  /* -------------------------- VOTING -------------------------- */

  async handleVote(projectId) {
    try {
      const qrVoteId = JSON.parse(sessionStorage.getItem("qrVoteId"));
      const tokenKey = this.isStaff
        ? `voter_token_staff_${this.staffToken}`
        : `voter_token_${this.eventId}`;
      const voterToken = localStorage.getItem(tokenKey);

      await submitVote(qrVoteId, Number(projectId), voterToken);

      const votedKey = this.isStaff
        ? `voted_staff_${this.staffToken}`
        : `voted_event_${this.eventId}`;
      localStorage.setItem(votedKey, "true");

      alert(t("publicVoting.voteSuccess"));
      this.disableVoting();
    } catch (error) {
      console.error("Vote error:", error);
      alert(t("publicVoting.voteError"));
    }
  }

  disableVoting() {
    document.querySelectorAll(".vote-btn").forEach((btn) => (btn.disabled = true));
  }

  /* -------------------------- RENDER -------------------------- */

  renderFinalists() {
    if (!this.ranking.length) {
      return `
        <div class="text-center py-5 text-secondary">
          <p>${t("publicVoting.noTeams") || "No teams available yet."}</p>
        </div>`;
    }

    const colors = [
      { bg: "#a7f3d0", decorator: "top-0 end-0", decoratorStyle: "transform:translate(25%,-25%)" },
      { bg: "#fde68a", decorator: "bottom-0 start-0", decoratorStyle: "transform:translate(-25%,25%)" },
      { bg: "#fda4af", decorator: "top-50 end-0", decoratorStyle: "transform:translate(25%,-50%)" },
    ];

    return this.ranking.map((team, index) => {
      const color = colors[index % colors.length];
      return `
        <div class="team-card w-100 bg-white rounded-4 p-4 shadow text-center position-relative overflow-hidden mb-4"
             style="cursor:pointer; border: 3px solid transparent;">
          <div class="position-absolute rounded-circle opacity-50 ${color.decorator}"
               style="width:64px;height:64px;background:${color.bg};${color.decoratorStyle};"></div>
          <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
               style="width:64px;height:64px;background:${color.bg};">
          </div>
          <h3 class="fw-bold mb-2" style="color:#1e1b4b;">${team.team_name}</h3>
          <p class="text-secondary mb-4">${team.name || team.project_name || ""}</p>
          <button class="vote-btn btn w-100 fw-bold py-3 rounded-pill text-white"
                  style="background:#7c3aed;box-shadow:0 4px 14px rgba(124,58,237,0.3);"
                  data-team="${team.id_project}">
            Vote for Me!
          </button>
        </div>
      `;
    }).join("");
  }

  attachEvents() {
    const buttons = document.querySelectorAll(".vote-btn");

    buttons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const teamId = btn.dataset.team;
        await this.handleVote(teamId);
      });
    });
  }

  async render(container) {
    await this.fetchEvent();
    await this.fetchRanking();

    // En modo staff el token de la URL es suficiente para identificar la sesión
    if (!this.isStaff && !this.event) {
      container.innerHTML = `
        <div style="text-align:center;padding:48px;">
          <h2>Event not found</h2>
          <p>The event you're looking for doesn't exist or is no longer available.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="vote-page mx-0 ">
        <header class="vote-header">
          <h1>TeamUp Voting</h1>
          <p>Vote for the best project</p>
        </header>
        <section class="finalists-list">
          ${this.renderFinalists()}
        </section>
      </div>
    `;

    if (localStorage.getItem(`voted_staff_${this.staffToken}`) ||
        localStorage.getItem(`voted_event_${this.eventId}`)) {
      this.disableVoting();
    }

    this.attachEvents();
    this._offLangChange = onLangChange(() => this.render(container));
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}