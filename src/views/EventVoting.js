import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getEventRanking } from "../services/api-events.js";
import { createQR, getQR } from "../services/api.js";
import { getUser } from "../utils/auth.js";
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
      pill.textContent = "Active";
      pill.classList.remove("bg-inactive");
      pill.classList.add("bg-active");
    } else {
      pill.textContent = "Inactive";
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

          btn.innerText = "Generate QR";
          btn.classList.remove("btn-primary-disabled");
          btn.classList.add("btn-primary-custom");

          this.updateQrStatusPill();
          return;
        }

        const expirationValue = expirationInput?.value;

        if (!expirationValue) {
          alert("Please select a QR expiration date.");
          return;
        }

        const expirationDate = new Date(expirationValue).toISOString();

        btn.disabled = true;
        btn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2"></span>
        Generating QR...
      `;

        const eventId = getSelectedEvent();

        const voteUrl = `https://team-up.crudzaso.com/vote/${eventId}`;

        let qrSrc = await getQR(eventId);

        if (!qrSrc) {
          qrSrc = await createQR(eventId, expirationDate, voteUrl);
        }

        qrImg.src = qrSrc;

        this.qrActive = true;

        btn.innerText = "Disable QR";
        btn.classList.remove("btn-primary-custom");
        btn.classList.add("btn-primary-disabled");

        this.updateQrStatusPill();
      } catch (err) {
        console.error("QR error:", err);
        alert("Error generating QR");
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

        <h5>Event Ranking</h5>

        <div>
          Finalists:
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

          </div>
        `,
          )
          .join("")}

      </div>

      <div class="text-end mt-4">

        <button class="btn btn-success" id="approve-finalists-btn">
          Approve Finalists
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

        alert("Finalists approved successfully!");
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

    this.updateQrStatusPill();
  }
}
