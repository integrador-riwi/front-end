import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventRanking, calculateFinalists } from "../services/api-events.js";
import { createQR, getQR, getVoteResults, apiFetch } from "../services/api.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/qr-voting.css";
import template from "../../pages/admin_qr.html?raw";
import { getSelectedEvent } from "../utils/helpers.js";
import defaultLogo from "../assets/logo.svg";
import { initSocket, on, off } from "../services/socket.js";
import { icons } from "../utils/icons.js";

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

    this.voteResults = [];
    this.totalVotes = 0;

    this.pollingInterval = null;
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
    const resultsSection = document.getElementById("results-section");
    const votingBanner = document.getElementById("voting-closed-banner");

    if (!pill) return;

    if (this.qrActive) {
      pill.textContent = "Active";
      pill.classList.remove("bg-inactive");
      pill.classList.add("bg-active");
      this.updateSubmitVotesButton();

      if (votingBanner) votingBanner.style.display = "none";
      if (resultsSection) resultsSection.style.display = "block";
    } else {
      pill.textContent = "Inactive";
      pill.classList.remove("bg-active");
      pill.classList.add("bg-inactive");
      this.updateSubmitVotesButton();

      if (this.voteResults?.length) {
        if (votingBanner) votingBanner.style.display = "flex";
        if (resultsSection) resultsSection.style.display = "block";
      }
    }
  }

  updateQrButtonState() {
    const btn = document.getElementById("generate-qr-btn");
    const expirationInput = document.getElementById("qr-expiration");
    if (!btn) return;

    if (this.qrActive) {
      btn.disabled = false;
      btn.innerText = "Disable QR";
      btn.classList.remove("btn-primary-custom", "btn-secondary");
      btn.classList.add("btn-primary-disabled");
      return;
    }

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
        this.updateQrButtonState();
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
          qrImg.src = defaultLogo;
          localStorage.removeItem(`qr_event_${getSelectedEvent()}`);

          this.stopPolling();
          off("vote:new");

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

  updateSubmitVotesButton() {
    const section = document.getElementById("submit-votes-section");
    if (!section) return;

    // Show only when QR is inactive and there are vote results
    if (!this.qrActive && this.voteResults?.length) {
      section.style.display = "block";
    } else {
      section.style.display = "none";
    }
  }

  async handleSubmitVotes() {
    const btn = document.getElementById("submit-votes-btn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const confirmed = confirm(
        "Are you sure you want to close voting and calculate winners? This cannot be undone.",
      );
      if (!confirmed) return;

      btn.disabled = true;
      btn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span>
      Calculating winners...
    `;

      try {
        const eventId = getSelectedEvent();
        const result = await calculateFinalists(eventId);

        console.log("Finalists calculated:", result);

        btn.innerHTML = `<span class="icon-md align-items-center">${icons.checked()}</span> Winners calculated!`;
        btn.classList.remove("btn-approve");
        btn.classList.add("btn-secondary");

        // Show success message
        const section = document.getElementById("submit-votes-section");
        section.innerHTML = `
        <div class="d-flex align-items-center gap-3 p-2">
          <div class="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
               style="width:40px;height:40px;background:rgba(90,204,164,0.1);">
            <span class="material-symbols-outlined" style="color:#5acca4;">check_circle</span>
          </div>
          <div>
            <div class="fw-bold" style="color:#5acca4;">Voting closed successfully!</div>
            <div style="color:#7b7fa8;font-size:0.85rem;">Winners have been calculated. Go to the Finalists page to see the podium.</div>
          </div>
        </div>
      `;
      } catch (err) {
        console.error("Failed to calculate finalists:", err);

        // Check if already calculated
        if (err?.response?.status === 409 || err?.message?.includes("once")) {
          btn.innerHTML = `  <span class="d-flex align-items-center gap-2">
                              <span class="icon-md">${icons.danger()}</span>
                              <span>Already calculated</span>
                            </span>`;
          btn.classList.remove("btn-approve");
          btn.classList.add("btn-secondary");
        } else {
          alert("Error calculating winners: " + err.message);
          btn.disabled = false;
          btn.innerHTML = `Submit Votes & Calculate Winners`;
        }
      }
    });
  }

  handleResetVotes() {
  // Only show reset section for ADMIN
  const resetSection = document.getElementById("reset-votes-section");
  if (!resetSection) return;

  if (this.user?.role === 'ADMIN') {
    resetSection.style.display = "block";
  } else {
    resetSection.style.display = "none";
    return;
  }

  const btn = document.getElementById("reset-votes-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const confirmed = confirm(
      "⚠️ This will permanently delete ALL votes for this event. Are you sure?"
    );
    if (!confirmed) return;

    btn.disabled  = true;
    btn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span>
      Resetting...
    `;

    try {
      const eventId = getSelectedEvent();

      // 👇 Ask backend teammate to implement this endpoint
      // DELETE /api/qr-votes/event/:eventId/reset
      await apiFetch(`/qr-votes/event/${eventId}/votes`, { method: 'DELETE' });

      // Clear localStorage QR cache
      localStorage.removeItem(`qr_event_${eventId}`);

      // Reset local state
      this.voteResults      = [];
      this.totalVotes       = 0;
      this.qrActive         = false;
      this.finalistsApproved = false;

      // Reset QR image
      const qrImg = document.getElementById("qr");
      if (qrImg) qrImg.src = defaultLogo;

      // Update UI
      this.renderResults();
      this.updateQrStatusPill();
      this.updateQrButtonState();
      this.updateDownloadButton(null);
      this.updateSubmitVotesButton();

      btn.innerHTML = `✅ Votes reset successfully`;
      btn.disabled  = false;

      // Reload ranking panel to reset approve state
      this.renderRankingPanel();

    } catch (err) {
      console.error("Failed to reset votes:", err);
      alert("Error resetting votes: " + err.message);
      btn.disabled  = false;
      btn.innerHTML = `
        <span class="material-symbols-outlined align-middle me-1" style="font-size:16px;">restart_alt</span>
        Reset Votes
      `;
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
    <div class="ranking-cards-grid">
      ${this.ranking
        .slice(0, 8)
        .map((team, index) => {
          const isFinalist = this.finalists.find(
            (t) => t.id_team === team.id_team,
          );
          const av = avatarColors[index % avatarColors.length];

          return `
          <div class="ranking-card rounded-4 overflow-hidden d-flex flex-column align-items-center">

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

  /* -------------------------- LIVE RESULTS -------------------------- */

  subscribeToVotes() {
    // Wait for socket to connect before registering handler
    setTimeout(async () => {
      const { getSocket } = await import("../services/socket.js");
      const socket = getSocket();
      console.log("socket after init:", socket?.connected);

      on("vote:new", async (data) => {
        console.log("vote:new received:", data);
        await this.fetchVoteResults();
        this.renderResults();
      });
    }, 2000);
  }

  destroy() {
    off("vote:new");
    this.stopPolling();
  }

  startPolling() {
    this.pollingInterval = setInterval(async () => {
      await this.fetchVoteResults();
      this.renderResults();
    }, 5000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async fetchVoteResults() {
    try {
      const eventId = getSelectedEvent();
      const res = await getVoteResults(eventId);
      this.voteResults = res?.results ?? res ?? [];
      this.totalVotes = this.voteResults.reduce(
        (sum, t) => sum + (t.votes ?? t.vote_count ?? 0),
        0,
      );
    } catch (err) {
      console.error("Failed to fetch vote results:", err);
      this.voteResults = [];
      this.totalVotes = 0;
    }
  }

  renderResults() {
    const container = document.getElementById("results-container");
    const totalEl = document.getElementById("total-votes");
    if (!container) return;

    const finalistIds = this.finalists.map((f) => f.id_project);

    const filteredResults = this.voteResults.filter((t) =>
      finalistIds.includes(t.id_project ?? t.id),
    );

    const filteredTotal = filteredResults.reduce(
      (sum, t) => sum + Number(t.total_votes ?? t.votes ?? t.vote_count ?? 0),
      0,
    );

    if (totalEl) totalEl.textContent = filteredTotal;

    if (!filteredResults.length) {
      container.innerHTML = `
      <div class="text-center py-5 result-empty">
        <span class="material-symbols-outlined d-block mb-2">how_to_vote</span>
        <p class="mb-0 fw-bold">No votes yet</p>
        <p class="mb-0 results-empty-sub">Results will appear here in real time</p>
      </div>`;
      return;
    }

    const sorted = [...filteredResults].sort(
      (a, b) => (b.votes ?? b.vote_count ?? 0) - (a.votes ?? a.vote_count ?? 0),
    );

    const accentColors = [
      "#eaa2fc",
      "#5acca4",
      "#e6ca52",
      "#6b5cff",
      "#fe654f",
      "#60a5fa",
    ];

    const avatarColors = [
      { bg: "#e0e7ff", color: "#6b5cff" },
      { bg: "#d1fae5", color: "#059669" },
      { bg: "#fef3c7", color: "#d97706" },
      { bg: "#fce7f3", color: "#db2777" },
      { bg: "#ede9fe", color: "#7c3aed" },
      { bg: "#dcfce7", color: "#16a34a" },
    ];

    const medals = ["🥇", "🥈", "🥉"];

    container.innerHTML = `
    <div class="d-flex flex-column gap-2">
      ${sorted
        .map((team, index) => {
          const votes = Number(
            team.total_votes ?? team.votes ?? team.vote_count ?? 0,
          );
          const percentage =
            filteredTotal > 0 ? Math.round((votes / filteredTotal) * 100) : 0;
          const accent = accentColors[index % accentColors.length];
          const av = avatarColors[index % avatarColors.length];
          const medal = medals[index] ?? `#${index + 1}`;

          return `
          <div class="result-list-item d-flex align-items-center gap-3 rounded-3 p-3"
               style="background:#f4f3ff;border:1.5px solid rgba(107,92,255,0.1);">

            <div class="fw-black text-center flex-shrink-0" style="width:28px;font-size:1rem;">
              ${medal}
            </div>

            <div class="result-avatar rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                 style="background:${av.bg};color:${av.color};width:36px;height:36px;font-size:0.85rem;">
              ${team.team_name?.[0]?.toUpperCase() ?? "?"}
            </div>

            <div class="flex-grow-1 overflow-hidden">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-truncate" style="color:#181e4b;font-size:0.85rem;">
                  ${team.team_name ?? ""}
                </span>
                <span class="fw-bold flex-shrink-0 ms-2" style="color:${accent};font-size:0.8rem;">
                  ${votes} votes · ${percentage}%
                </span>
              </div>
              <div class="rounded-pill overflow-hidden" style="height:6px;background:rgba(107,92,255,0.1);">
                <div class="h-100 rounded-pill"
                     style="width:${percentage}%;background:${accent};transition:width 0.5s ease;"></div>
              </div>
            </div>

          </div>
        `;
        })
        .join("")}
    </div>
  `;
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
    initSocket();
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
    this.handleSubmitVotes();
    this.handleResetVotes();
    this.updateQrButtonState();
    await this.loadExistingQR();

    await this.fetchVoteResults();
    this.renderResults();
    this.updateQrStatusPill();
    this.updateSubmitVotesButton();

    if (this.qrActive) {
      this.subscribeToVotes();
      this.startPolling();
    } else if (this.voteResults?.length) {
      
      this.pollingInterval = setInterval(async () => {
        await this.fetchVoteResults();
        this.renderResults();
      }, 15000); 
    }
  }
}
