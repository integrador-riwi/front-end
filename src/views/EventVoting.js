import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventRanking } from "../services/api-events.js";
import { createQR, getQR } from "../services/api.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/qr-voting.css";
import template from '../../pages/admin_qr.html?raw';
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
    this.finalistsApproved = false;
  }

  /* -------------------------- RANKING -------------------------- */

  async fetchRanking() {
    try {
      const eventId = getSelectedEvent();
      const response = await getEventRanking(eventId);

      this.ranking = response?.data?.ranking || [];
      this.updateFinalists();
    } catch (err) {
      console.error("Failed to fetch ranking:", err);
    }
  }

  updateFinalists() {
    if (!Array.isArray(this.ranking)) return;
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

  updateQrButtonState() {
    const btn = document.getElementById("generate-qr-btn");
    const expirationInput = document.getElementById("qr-expiration");
    if (!btn) return;

    const hasDate = !!expirationInput?.value;
    const canGenerate = this.finalistsApproved && hasDate;

    if (canGenerate) {
      btn.disabled = false;
      btn.classList.remove("btn-secondary");
      btn.classList.add("btn-primary-custom");
      btn.title = "";
    } else {
      btn.disabled = true;
      btn.classList.remove("btn-primary-custom");
      btn.classList.add("btn-secondary");
      btn.title = !this.finalistsApproved
        ? "Approve finalists first"
        : "Select an expiration date first";
    }
  }

  async loadExistingQR() {
    try {
      const eventId = getSelectedEvent();
      const cached = localStorage.getItem(`qr_event_${eventId}`);
      const qrSrc = cached || null;

    const qrImg = document.getElementById("qr");

    if (qrSrc) {
      qrImg.src     = qrSrc;
      this.qrActive = true;

      const btn = document.getElementById("generate-qr-btn");
      if (btn) {
        btn.innerText = "Disable QR";
        btn.classList.remove("btn-primary-custom");
        btn.classList.add("btn-primary-disabled");
      }

      this.updateDownloadButton(qrSrc);
      this.updateQrStatusPill();
    } else {
      this.updateDownloadButton(null);
    }
    } catch (err) {
      console.error("Failed to load existing QR:", err);
      this.updateDownloadButton(null);
    }
  }

  updateDownloadButton(qrSrc) {
    const downloadBtn = document.getElementById("download-qr-btn");
    if (!downloadBtn) return;

    if (qrSrc) {
      downloadBtn.disabled = false;
      downloadBtn.classList.remove("btn-secondary");
      downloadBtn.classList.add("btn-primary-custom");

      downloadBtn.onclick = () => {
        const SIZE = 512;
        const img = new Image();
        img.src = qrSrc;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = SIZE;
          canvas.height = SIZE;

          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, SIZE, SIZE);

          ctx.drawImage(img, 0, 0, SIZE, SIZE);

          const link = document.createElement("a");
          link.href = canvas.toDataURL("image/png");
          link.download = `qr-event-${getSelectedEvent()}.png`;
          link.click();
        };
      };
    } else {
      downloadBtn.disabled = true;
      downloadBtn.classList.remove("btn-primary-custom");
      downloadBtn.classList.add("btn-secondary");
      downloadBtn.title = "Generate a QR first";
      downloadBtn.onclick = null;
    }
  }

  async handleQRButton() {
    const btn = document.getElementById("generate-qr-btn");
    const qrImg = document.getElementById("qr");
    const expirationInput = document.getElementById("qr-expiration");

    expirationInput?.addEventListener("change", () => {
      this.updateQrButtonState();
    });

    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        if (this.qrActive) {
          this.qrActive = false;
          qrImg.src = "../src/assets/logo.svg";
           localStorage.removeItem(`qr_event_${getSelectedEvent()}`);

          btn.innerText = "Generate QR";
          btn.classList.remove("btn-primary-disabled");
          btn.classList.add("btn-primary-custom");

          this.updateQrStatusPill();
          this.updateDownloadButton(null);
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

        let qrSrc = await getQR(eventId);

        if (
          !qrSrc ||
          (Array.isArray(qrSrc) && qrSrc.length === 0) ||
          typeof qrSrc !== "string"
        ) {
          const response = await createQR(
            eventId,
            expirationDate,
            this.finalists,
          );
          qrSrc = response?.qrImage;
        }

        qrImg.src = qrSrc;
        this.qrActive = true;

        localStorage.setItem(`qr_event_${eventId}`, qrSrc);

        btn.innerText = "Disable QR";
        btn.classList.remove("btn-primary-custom");
        btn.classList.add("btn-primary-disabled");

        this.updateQrStatusPill();
        this.updateDownloadButton(qrSrc);
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
                  <small class="text-muted">${team.project_name}</small>
                </div>
                <span class="badge bg-primary">${team.score ?? "—"}</span>
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
        this.finalistsApproved = false;

        this.updateFinalists();
        this.renderRankingPanel();
        this.updateQrButtonState();
      });
    }

    const approveBtn = document.getElementById("approve-finalists-btn");

    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        this.finalistsApproved = true;

        approveBtn.disabled = true;
        approveBtn.innerHTML = `Finalists Approved`;
        approveBtn.classList.remove("btn-success");
        approveBtn.classList.add("btn-secondary");

        this.updateQrButtonState(); //

        console.log("Finalists approved:", this.finalists);
      });
    }
  }

  /* -------------------------- MAIN RENDER -------------------------- */

  async render() {
    const app = document.getElementById("app");

    app.innerHTML = `
    ${this.navbar.render()}
    <div style="display:flex;flex-direction:column;width:100%">
      ${this.header.render()}
      <main class="dashboard-main">
        ${template}
      </main>
    </div>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    await this.fetchRanking();
    this.renderRankingPanel();
    await this.handleQRButton();
    this.updateQrStatusPill();
    this.updateQrButtonState();
    await this.loadExistingQR();
  }
}
