import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventRanking } from "../services/api-events.js";
import { createQR, getQR } from "../services/api.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/qr-voting.css";
import template from "../../pages/admin_qr.html?raw";
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
        qrImg.src = qrSrc;
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

    const avatarColors = [
      { bg: "#e0e7ff", color: "#6b5cff" },
      { bg: "#d1fae5", color: "#059669" },
      { bg: "#fef3c7", color: "#d97706" },
      { bg: "#fce7f3", color: "#db2777" },
      { bg: "#ede9fe", color: "#7c3aed" },
      { bg: "#dcfce7", color: "#16a34a" },
    ];

    container.innerHTML = `

    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-4">
      <div>
        <h2 class="fw-bold mb-1" style="color:#181e4b;font-size:1.1rem;">Event Ranking</h2>
        <p class="mb-0" style="color:#7b7fa8;font-size:0.85rem;">Top performing teams</p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span style="color:#7b7fa8;font-size:0.85rem;">Finalists:</span>
        <select id="finalists-count" class="form-select form-select-sm"
                style="width:auto;border-color:rgba(107,92,255,0.3);color:#181e4b;font-size:0.85rem;">
          <option value="3">Top 3</option>
          <option value="4">Top 4</option>
          <option value="5">Top 5</option>
          <option value="6">Top 6</option>
          <option value="7">Top 7</option>
          <option value="8">Top 8</option>
        </select>
      </div>
    </div>

    <!-- Cards -->
    <div class="d-flex flex-wrap gap-3">
      ${this.ranking
        .slice(0,8)
        .map((team, index) => {
          const isFinalist = this.finalists.find(
            (t) => t.id_team === team.id_team,
          );
          const av = avatarColors[index % avatarColors.length];

          return `
          <div class="ranking-card rounded-4 overflow-hidden flex-shrink-0 d-flex flex-column align-items-center">

            <!-- Top accent bar -->
            <div class="ranking-card-bar ${isFinalist ? "finalist" : "regular"}"></div>

            <div class="p-4 d-flex flex-column align-items-center w-100">

              <!-- Avatar -->
              <div class="position-relative mb-3">
                <div class="ranking-avatar rounded-circle d-flex align-items-center justify-content-center fw-bold"
                     style="background:${av.bg};color:${av.color};">
                  ${team.team_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                ${
                  isFinalist
                    ? `
                <div class="ranking-check position-absolute d-flex align-items-center justify-content-center rounded-circle">
                </div>`
                    : ""
                }
              </div>

              <!-- Info -->
              <div class="text-center w-100">
                <div class="ranking-team-name fw-bold mb-1">
                  ${team.team_name}
                </div>
 
                <!-- Score -->
                <div class="ranking-score d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 mb-2">
                  ${team.team_score ?? "—"}
                </div>

                <!-- Finalist badge -->
                ${
                  isFinalist
                    ? `
                <div>
                  <span class="ranking-finalist-badge badge rounded-pill fw-bold text-uppercase">
                    ✓ Finalist
                  </span>
                </div>`
                    : ""
                }
              </div>

            </div>
          </div>
        `;
        })
        .join("")}
    </div>

    <!-- Approve button -->
    <div class="text-end mt-4">
      <button class="btn btn-approve fw-bold px-4 py-2 rounded-3" id="approve-finalists-btn">
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
