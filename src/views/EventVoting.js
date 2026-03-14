import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventRanking } from "../services/api-events.js";
import { createQR, getQR } from "../services/api.js";
import { getUser } from "../utils/auth.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/qr-voting.css";
import { getSelectedEvent } from "../utils/helpers.js";

export default class QRVoting {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);

    this.ranking = [];
    this.finalists = [];
    this.finalistsCount = 3;

    this.qrActive = false;
  }

  /* -------------------------- RANKING -------------------------- */

  async fetchRanking() {
    try {
      const eventId = getSelectedEvent();

      const response = await getEventRanking(eventId);

      console.log("Ranking API response:", response);

      this.ranking = response?.data?.ranking || [];
      console.log("Ranking array:", this.ranking);

      this.updateFinalists();
    } catch (err) {
      console.error("Failed to fetch ranking:", err);
    }
  }

  updateFinalists() {
    this.finalists = this.ranking.slice(0, this.finalistsCount);
  }

  /* -------------------------- QR -------------------------- */

  updateQrStatusPill() {
    const pill = document.getElementById("qr-status-pill");
    if (!pill) return;

    if (this.qrActive) {
      pill.textContent = t("voting.active");
      pill.classList.remove("bg-inactive");
      pill.classList.add("bg-active");
    } else {
      pill.textContent = t("voting.inactive");
      pill.classList.remove("bg-active");
      pill.classList.add("bg-inactive");
    }
  }

  async handleQRButton() {
    const btn = document.getElementById("generate-qr-btn");
    const qrImg = document.getElementById("qr");
    const expirationInput = document.getElementById("qr-expiration");

    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        if (this.qrActive) {
          this.qrActive = false;

          qrImg.src = "../src/assets/logo.svg";

          btn.innerText = t("voting.generateQR");
          btn.classList.remove("btn-primary-disabled");
          btn.classList.add("btn-primary-custom");

          this.updateQrStatusPill();
          return;
        }

        const expirationValue = expirationInput?.value;

        if (!expirationValue) {
          alert(t("voting.selectExpiration"));
          return;
        }

        const expirationDate = new Date(expirationValue).toISOString();

        btn.disabled = true;
        btn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        ${t("common.loading")}
      `;

        const eventId = getSelectedEvent();

        const voteUrl = `https://team-up.crudzaso.com/vote/${eventId}`;

        let qrSrc = await getQR(eventId);

        if (!qrSrc) {
          qrSrc = await createQR(eventId, expirationDate, voteUrl);
        }

        qrImg.src = qrSrc;

        this.qrActive = true;

        btn.innerText = t("voting.disableQR");
        btn.classList.remove("btn-primary-custom");
        btn.classList.add("btn-primary-disabled");

        this.updateQrStatusPill();
      } catch (err) {
        console.error("QR error:", err);
        alert(t("common.error"));
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* -------------------------- RENDER RANKING -------------------------- */

  renderRankingPanel() {
    const container = document.getElementById("ranking-container");

    if (!container) return;

    container.innerHTML = `

      <div class="d-flex justify-content-between align-items-center mb-3">

        <h5>${t("nav.ranking")}</h5>

        <div>
          ${t("events.finalists")}:
          <select id="finalists-count" class="form-select form-select-sm d-inline w-auto">

            <option value="3">Top 3</option>
            <option value="6">Top 6</option>
            <option value="10">Top 10</option>

          </select>
        </div>

      </div>

      <div class="row g-3">

        ${this.ranking
          .map(
            (team, index) => `
          
          <div class="col-md-4">

            <div class="card p-3 ranking-card">

              <div class="d-flex justify-content-between">

                <div>

                  <strong>#${index + 1} ${team.team_name}</strong><br>

                  <small class="text-muted">
                    ${team.project_name}
                  </small>

                </div>

                <span class="badge bg-primary">
                  ${team.score ?? "—"}
                </span>

              </div>

              ${
                this.finalists.find((t) => t.id_team === team.id_team)
                  ? `<span class="badge bg-success mt-2">Finalist</span>`
                  : ""
              }

            </div>

            ${
              this.finalists.find((t) => t.id === team.id)
                ? `<span class="badge bg-success mt-2">${t("events.finalists")}</span>`
                : ""
            }

          </div>
        `,
          )
          .join("")}

      </div>

      <div class="text-end mt-4">

        <button class="btn btn-success" id="approve-finalists-btn">
          ${t("events.approveFinalists")}
        </button>

      </div>
    `;

    this.attachRankingHandlers();
  }

  attachRankingHandlers() {
    const select = document.getElementById("finalists-count");

    if (select) {
      select.value = this.finalistsCount;

      select.addEventListener("change", (e) => {
        this.finalistsCount = Number(e.target.value);

        this.updateFinalists();

        this.renderRankingPanel();
      });
    }

    const approveBtn = document.getElementById("approve-finalists-btn");

    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        console.log("Finalists approved:", this.finalists);

        alert(t("events.approveFinalistsSuccess"));
      });
    }
  }

  renderVotingView() {
    const slotsContainer = document.getElementById("ranking-slots");
    const teamsContainer = document.getElementById("available-teams");

    if (!slotsContainer || !teamsContainer || !this.event) return;

    teamsContainer.innerHTML = this.renderAvailableTeams(this.event.finalists);

    this.attachTeamSelection();
  }

  renderLoading() {
    return `
      <div class="d-flex justify-content-center align-items-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">${t("common.loading")}</span>
        </div>
      </div>
    `;
  }

  renderError(message) {
    return `
      <div class="alert alert-danger rounded-4 mt-4" role="alert">
        ${message}
      </div>
    `;
  }

  renderFinalistsSection(finalists = []) {
    if (!finalists.length) {
      return `<div class="text-muted">${t("voting.noTeams")}</div>`;
    }

    return finalists.map((team) => this.renderTeamCard(team)).join("");
  }

  renderTeamCard(team, { selectable = false } = {}) {
    if (!team) return "";

    const initials = (team.team_name || "NA")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return `
    <div class="col-md-6 col-lg-4">
      <div class="teamF-card ${selectable ? "selectable-team" : ""} 
           d-flex flex-column align-items-center"
           ${selectable ? `data-id="${team.id}"` : ""}>
           
        <div class="team-avatar">
          ${initials}
        </div>

        <div class="mt-2 text-center">
          <strong>${team.team_name || "Unnamed Team"}</strong><br>
          <small class="text-muted">
            ${team.project_name || "Project"}
          </small>
        </div>

      </div>
    </div>
  `;
  }

  renderAvailableTeams(finalists = []) {
    if (!finalists.length) {
      return `<div class="text-muted">${t("voting.noTeams")}</div>`;
    }

    const rankedIds = this.ranking.filter(Boolean).map((team) => team.id);

    const available = finalists.filter((team) => !rankedIds.includes(team.id));

    if (!available.length) {
      return `<div class="text-muted">${t("voting.allRanked")}</div>`;
    }

    return available
      .map((team) => this.renderTeamCard(team, { selectable: true }))
      .join("");
  }

  attachTeamSelection() {
    document.querySelectorAll(".selectable-team").forEach((card) => {
      card.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const team = this.event.finalists.find((t) => t.id == id);

        if (!team) return;

        // Toggle logic: if already ranked, remove it
        const rankedIndex = this.ranking.findIndex((t) => t?.id === team.id);
        if (rankedIndex !== -1) {
          this.ranking[rankedIndex] = null;
          this.renderVotingView();
          return;
        }

        // Add logic: fill first available slot in 2-1-3 order
        const fillOrder = [1, 0, 2];
        const emptyIndex = fillOrder.find(
          (index) => this.ranking[index] === null,
        );

        if (emptyIndex !== undefined) {
          this.ranking[emptyIndex] = team;
          this.renderVotingView();
        } else {
          alert(t("voting.select3"));
        }
      });
    });

    const launchBtn = document.querySelector(".btn-primary-custom.shadow");
    if (launchBtn) {
      launchBtn.addEventListener("click", () => {
        const selectedTeams = this.ranking.filter(Boolean);
        if (selectedTeams.length < 3) {
          alert(t("voting.select3"));
          return;
        }

        launchBtn.disabled = true;
        launchBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ${t("voting.launching")}`;

        setTimeout(() => {
          alert(
            `${t("voting.launched")}: \n1st: ${this.ranking[1].team_name}\n2nd: ${this.ranking[0].team_name}\n3rd: ${this.ranking[2].team_name}`,
          );
          launchBtn.innerHTML = t("voting.launched");
          launchBtn.classList.remove("btn-primary-custom");
          launchBtn.classList.add("btn-success");
        }, 1500);
      });
    }
  }

  /* -------------------------- MAIN RENDER -------------------------- */

  async render() {
    const app = document.getElementById("app");

    const template = await fetch("../../pages/admin_qr.html").then((r) =>
      r.text(),
    );

    app.innerHTML = `
      ${this.navbar.render()}
      ${this.header.render()}
      <main class="dashboard-main">
        ${template}
      </main>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    await this.fetchRanking();

    this.renderRankingPanel();

    this.handleQRButton();

    const finalistsContainer = document.getElementById("finalists-container");

    if (!finalistsContainer) {
      console.error("Finalists container not found");
      return;
    }

    this.renderVotingView();

    const availableTeamsContainer = document.getElementById("available-teams");

    if (!availableTeamsContainer) {
      console.error("Available teams container not found");
      return;
    }

    availableTeamsContainer.innerHTML = this.renderAvailableTeams(
      this.event?.finalists || [],
    );

    this.attachTeamSelection(); // Re-attach handlers after full render

    this._offLangChange = onLangChange(() => {
      this.updateQrStatusPill();
      this.renderRankingPanel();
      this.renderVotingView();
    });
  }

  attachEventHandlers() {
    const generateQrBtn = document.getElementById("generate-qr-btn");
    const qrImg = document.getElementById("qr");

    document.querySelectorAll(".view-project-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;

        if (id) {
          this.router.navigate(`/projects/${id}`);
        }
      });
    });

    if (!generateQrBtn) return;

    generateQrBtn.addEventListener("click", async () => {
      try {
        if (this.qrActive) {
          this.qrActive = false;

          qrImg.src = "../src/assets/logo.svg";
          generateQrBtn.innerText = t("voting.generateQR");
          generateQrBtn.classList.remove("btn-primary-disabled");
          generateQrBtn.classList.add("btn-primary-custom");

          this.updateQrStatusPill();
          return;
        }

        generateQrBtn.disabled = true;
        generateQrBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        ${t("common.loading")}
      `;

        let qrSrc = await getQR(getSelectedEvent());

        if (!qrSrc) {
          qrSrc = await createQR(
            getSelectedEvent(),
            "2026-03-27T24:00:00.000Z",
          );
        }

        qrImg.src = qrSrc;

        this.qrActive = true;

        generateQrBtn.innerText = t("voting.disableQR");
        generateQrBtn.classList.remove("btn-primary-custom");
        generateQrBtn.classList.add("btn-primary-disabled");
        this.updateQrStatusPill();
      } catch (err) {
        console.error("QR error:", err);
        alert(t("common.error"));
      } finally {
        generateQrBtn.disabled = false;
      }
    });
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
