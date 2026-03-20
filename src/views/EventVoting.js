import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getEventRanking, calculateFinalists } from "../services/api-events.js";
import { createQR, createStaffQR, getQR, getQRImage, getQRImageById, toggleQR, getVoteResults, apiFetch, auditVotesByEvent } from "../services/api.js";
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

    this.staffQrLink = null;
    this.staffQrImage = null;
    this.staffQrId = null;

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

      // Always check backend for active QR — localStorage may be stale
      const qrList = await getQR(eventId);
      const activeQr = Array.isArray(qrList)
          ? qrList.find(q => q.active && q.vote_type === "PUBLIC")
          : null;

      // Also load existing staff QR link if it exists
      const activeStaffQr = Array.isArray(qrList)
          ? qrList.find(q => q.vote_type === "STAFF" && q.staff_token)
          : null;
      if (activeStaffQr) {
        this.staffQrLink  = activeStaffQr.qr_code_url ?? null;
        this.staffQrId    = activeStaffQr.id ?? null;
        // Recuperar imagen cacheada, o pedirla al backend
        const staffCacheKey = `qr_staff_${this.staffQrId}`;
        const cached = localStorage.getItem(staffCacheKey);
        if (cached) {
          this.staffQrImage = cached;
        } else {
          try {
            const imgData = await getQRImageById(this.staffQrId);
            this.staffQrImage = imgData?.qrImage ?? null;
            if (this.staffQrImage) localStorage.setItem(staffCacheKey, this.staffQrImage);
          } catch (e) {
            console.error('Failed to load staff QR image:', e);
          }
        }
      }

      const qrImg = document.getElementById("qr");

      if (activeQr) {
        // Use cached image if available, otherwise regenerate from QR URL
        const cached = localStorage.getItem(`qr_event_${eventId}`);
        let qrSrc = cached || null;

        if (!qrSrc) {
          // Regenerate QR image from backend (uses qrcode library)
          try {
            const imgData = await getQRImage(eventId);
            qrSrc = imgData?.qrImage ?? null;
            if (qrSrc) localStorage.setItem(`qr_event_${eventId}`, qrSrc);
          } catch (e) {
            console.error("Failed to regenerate QR image:", e);
          }
        }

        if (qrSrc && qrImg) qrImg.src = qrSrc;
        this.qrActive = true;
        this.finalistsApproved = true;

        // Store expires_at so render() can fill the input after handleQRButton registers
        this._activeQrExpiresAt = activeQr.expires_at ?? null;

        // Extract finalist_ids from the active QR to populate this.finalists
        const finalistIds = Array.isArray(activeQr.finalist_ids)
            ? activeQr.finalist_ids
            : (typeof activeQr.finalist_ids === "string"
                ? JSON.parse(activeQr.finalist_ids || "[]")
                : []);

        this.finalistsCount = finalistIds.length || activeQr.top_n || this.finalistsCount;
        // Map finalist_ids back to ranking teams
        if (finalistIds.length > 0) {
          this.finalists = finalistIds
              .map(id => this.ranking.find(t => t.id_project === id || t.id_team === id))
              .filter(Boolean);
          // Fallback: if mapping fails, just take top N from ranking
          if (this.finalists.length === 0) {
            this.finalists = this.ranking.slice(0, this.finalistsCount);
          }
        } else {
          this.finalists = this.ranking.slice(0, this.finalistsCount);
        }

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

          // Validar que exista staff link generado
          if (!this.staffQrLink) {
            alert("You must generate the Staff Voting Link before disabling the QR.");
            return;
          }

          // Validar que haya al menos 1 voto de staff
          const totalStaffVotes = this.voteResults.reduce(
              (sum, t) => sum + Number(t.staff_ballots ?? 0), 0
          );
          const uniqueStaffVoters = Math.round(totalStaffVotes / 3);
          if (uniqueStaffVoters < 1) {
            alert("At least 1 staff vote must be registered before disabling the QR.");
            return;
          }

          btn.disabled = true;
          btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Disabling...`;

          try {
            // Desactivar el QR en la DB
            const eventId = getSelectedEvent();
            const qrList = await getQR(eventId);
            const activeQr = Array.isArray(qrList)
                ? qrList.find(q => q.active && q.vote_type === "PUBLIC")
                : null;
            if (activeQr) await toggleQR(activeQr.id);
          } catch (err) {
            console.error("Failed to disable QR in DB:", err);
          }

          this.qrActive = false;
          qrImg.src = defaultLogo;
          localStorage.removeItem(`qr_event_${getSelectedEvent()}`);

          this.stopPolling();
          off("vote:new");

          btn.disabled = false;
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

  /* -------------------------- STAFF QR -------------------------- */

  renderStaffQRSection() {
    let container = document.getElementById("staff-qr-section");

    // Si el div no existe en el template aún, lo creamos después del danger zone
    if (!container) {
      const dangerZone = document.getElementById("reset-votes-section");
      if (!dangerZone) return;
      container = document.createElement("div");
      container.id = "staff-qr-section";
      container.className = "mt-3";
      dangerZone.insertAdjacentElement("afterend", container);
    }

    container.innerHTML = `
      <div class="rounded-4 p-4" style="background:#fff;border:1.5px solid rgba(107,92,255,0.15);">
        <div class="d-flex align-items-center gap-2 mb-3">
          <span class="material-symbols-outlined" style="color:#6b5cff;font-size:1.2rem;">lock</span>
          <h3 class="fw-bold mb-0" style="color:#181e4b;font-size:1rem;">Staff Voting Link</h3>
          <span class="badge rounded-pill ms-1" style="background:rgba(107,92,255,0.1);color:#6b5cff;font-size:0.7rem;">PRIVATE</span>
        </div>
        <p class="mb-3" style="color:#7b7fa8;font-size:0.83rem;">
          Generate a private link for staff members only. This link is different from the public QR and won't be visible to the audience.
        </p>

        ${this.staffQrLink ? `
          <!-- QR image -->
          ${this.staffQrImage ? `
          <div class="d-flex flex-column align-items-center mb-3">
            <div style="background:#fff;border:1.5px solid rgba(107,92,255,0.15);border-radius:12px;padding:12px;display:inline-block;">
              <img src="${this.staffQrImage}" alt="Staff QR" style="width:180px;height:180px;display:block;border-radius:6px;"/>
            </div>
            <p class="mt-2 mb-0" style="font-size:0.75rem;color:#7b7fa8;">Muestra este QR solo al staff</p>
          </div>` : ""}

          <!-- Link generado — oculto como contraseña -->
          <div class="staff-link-box">
            <span class="material-symbols-outlined staff-link-icon">lock</span>
            <span class="staff-link-dots">••••••••••••••••••••••••</span>
            <button id="copy-staff-link-btn" class="staff-link-copy-btn">
              <span class="material-symbols-outlined">content_copy</span>
              Copy
            </button>
          </div>

          <div class="d-flex gap-2">
            <button id="regenerate-staff-qr-btn" class="staff-link-regen-btn" style="flex:1;">
              Regenerate Link
            </button>
            <button id="disable-staff-qr-btn" class="staff-link-regen-btn"
                    style="flex:1;color:#fe654f;border-color:rgba(254,101,79,0.25);">
              Disable Link
            </button>
          </div>

        ` : `
          <!-- Sin link aún -->
          <button id="generate-staff-qr-btn"
                  class="btn w-100 fw-bold"
                  style="background:rgba(107,92,255,0.08);color:#6b5cff;border:1.5px dashed rgba(107,92,255,0.3);border-radius:10px;font-size:0.875rem;padding:10px;"
                  ${!this.finalistsApproved ? "disabled title='Approve finalists first'" : ""}>
            <span class="material-symbols-outlined align-middle me-1" style="font-size:1rem;">add_link</span>
            Generate Staff Link
          </button>
          ${!this.finalistsApproved ? `
            <p class="text-center mt-2 mb-0" style="font-size:0.75rem;color:#7b7fa8;">
              Approve finalists before generating the staff link
            </p>
          ` : ""}
        `}
      </div>
    `;

    this._attachStaffQRHandlers();
  }

  _attachStaffQRHandlers() {
    // Generar por primera vez
    const generateBtn = document.getElementById("generate-staff-qr-btn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => this._generateStaffQR(generateBtn));
    }

    // Regenerar
    const regenBtn = document.getElementById("regenerate-staff-qr-btn");
    if (regenBtn) {
      regenBtn.addEventListener("click", () => this._generateStaffQR(regenBtn));
    }

    // Deshabilitar staff link
    const disableBtn = document.getElementById("disable-staff-qr-btn");
    if (disableBtn) {
      disableBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to disable the staff voting link?")) return;
        disableBtn.disabled = true;
        disableBtn.textContent = "Disabling…";
        try {
          if (this.staffQrId) {
            localStorage.removeItem(`qr_staff_${this.staffQrId}`);
            await toggleQR(this.staffQrId);
          }
          this.staffQrLink  = null;
          this.staffQrId    = null;
          this.staffQrImage = null;
          this.renderStaffQRSection();
        } catch (err) {
          console.error("Failed to disable staff QR:", err);
          disableBtn.disabled = false;
          disableBtn.textContent = "Disable Link";
        }
      });
    }

    // Copiar link
    const copyBtn = document.getElementById("copy-staff-link-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(this.staffQrLink);
          copyBtn.textContent = "Copied!";
          copyBtn.style.background = "rgba(90,204,164,0.15)";
          copyBtn.style.color = "#059669";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.style.background = "rgba(107,92,255,0.1)";
            copyBtn.style.color = "#6b5cff";
          }, 2000);
        } catch {
          copyBtn.textContent = "Error";
        }
      });
    }
  }

  async _generateStaffQR(triggerBtn) {
    if (!this.finalistsApproved) return;

    const expirationInput = document.getElementById("qr-expiration");
    const expirationValue = expirationInput?.value;
    if (!expirationValue) {
      alert("Please select an expiration date first.");
      return;
    }

    const originalHtml = triggerBtn.innerHTML;
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Generating…`;

    try {
      const eventId = getSelectedEvent();
      const expirationDate = new Date(expirationValue).toISOString();

      const response = await createStaffQR(eventId, expirationDate, this.finalists);
      const data = response?.data ?? response;

      this.staffQrLink  = data?.votePageUrl ?? data?.qrVote?.qr_code_url ?? null;
      this.staffQrImage = data?.qrImage ?? null;
      this.staffQrId    = data?.qrVote?.id ?? null;

      // Cachear imagen para recuperarla si el admin recarga la página
      if (this.staffQrId && this.staffQrImage) {
        localStorage.setItem(`qr_staff_${this.staffQrId}`, this.staffQrImage);
      }

      this.renderStaffQRSection();
    } catch (err) {
      console.error("Staff QR error:", err);
      alert("Error generating staff link: " + (err?.message ?? "Unknown error"));
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = originalHtml;
    }
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

        btn.innerHTML = `Votes reset successfully`;
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
    <div class="d-flex align-items-center justify-content-between mt-4 flex-wrap gap-2">
      ${this.finalistsApproved ? `
        <div class="d-flex align-items-center gap-2 rounded-3 px-3 py-2"
             style="background:rgba(90,204,164,0.1);border:1px solid rgba(90,204,164,0.3);">
          <span class="material-symbols-outlined" style="color:#5acca4;font-size:1rem;">check_circle</span>
          <span style="color:#059669;font-size:0.85rem;font-weight:700;">
            ${this.finalists.length} finalist${this.finalists.length !== 1 ? "s" : ""} approved
          </span>
        </div>` : `<div></div>`}
      <button class="btn btn-approve fw-bold px-4 py-2 rounded-3" id="approve-finalists-btn"
              ${this.finalistsApproved ? "disabled" : ""}>
        ${this.finalistsApproved ? "Finalists Approved" : "Approve Finalists"}
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
      // Count unique ballots cast (people who voted), not point totals
      const totalPublic = this.voteResults.reduce((sum, t) => sum + Number(t.public_ballots ?? 0), 0);
      const totalStaff  = this.voteResults.reduce((sum, t) => sum + Number(t.staff_ballots  ?? 0), 0);
      // Each person votes once, so sum of ballots across all teams / 3 positions = unique voters
      // Use the max public_ballots of any single team as proxy, or sum divided by 3
      this.totalVotes = Math.round((totalPublic + totalStaff) / 3);
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

    // When QR is active or finalists are approved, show all results from the event
    // (the QR already scopes to the approved finalists on the backend)
    const finalistIds = this.finalists.map((f) => f.id_project).filter(Boolean);
    const filteredResults = (this.finalistsApproved && this.voteResults.length > 0)
        ? this.voteResults  // show all — QR already filtered on backend
        : finalistIds.length > 0
            ? this.voteResults.filter((t) => finalistIds.includes(t.id_project ?? t.id))
            : this.voteResults;

    // Show unique voters count, not total points
    const totalPublicBallots = filteredResults.reduce((sum, t) => sum + Number(t.public_ballots ?? 0), 0);
    const totalStaffBallots  = filteredResults.reduce((sum, t) => sum + Number(t.staff_ballots  ?? 0), 0);
    const uniqueVoters = Math.round((totalPublicBallots + totalStaffBallots) / 3);
    if (totalEl) totalEl.textContent = uniqueVoters;

    // Keep filteredTotal as points for bar percentage calculation
    const filteredTotal = filteredResults.reduce(
        (sum, t) => sum + Number(t.total_votes ?? t.votes ?? t.vote_count ?? 0),
        0,
    );

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
        (a, b) => Number(b.total_votes ?? b.votes ?? b.vote_count ?? 0) - Number(a.total_votes ?? a.votes ?? a.vote_count ?? 0),
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

        this.updateQrButtonState();
        this.renderStaffQRSection();

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

    // Mostrar spinner mientras carga el ranking
    const rankingContainer = document.getElementById("ranking-container");
    if (rankingContainer) {
      rankingContainer.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center" style="height: 200px; gap: 16px;">
          <div class="ce-spinner" style="width: 40px; height: 40px; border-width: 4px; border-color: rgba(107,92,255,0.2); border-top-color: var(--color-primary, #6b5cff);"></div>
          <p class="text-muted fw-medium">Loading Voting...</p>
        </div>
      `;
    }

    await this.fetchRanking();
    this.renderRankingPanel();
    await this.handleQRButton();
    this.handleSubmitVotes();
    this.handleResetVotes();
    await this.loadExistingQR();

    // Fill expiration date input with the active QR's expiry (must be after handleQRButton)
    if (this._activeQrExpiresAt) {
      const expirationInput = document.getElementById("qr-expiration");
      if (expirationInput) {
        const dt = new Date(this._activeQrExpiresAt);
        const pad = n => String(n).padStart(2, "0");
        expirationInput.value = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      }
    }

    // Re-render ranking panel now that we know if QR is active + finalists approved
    this.renderRankingPanel();
    this.updateQrButtonState();
    this.renderStaffQRSection();

    // Wire up audit button from template
    document.getElementById("open-audit-btn")?.addEventListener("click", () => this.openAuditModal());

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

  // ── Auditoría de votos ────────────────────────────────────────────────────
  async openAuditModal() {
    const eventId = getSelectedEvent();
    if (!eventId) return;

    let modal = document.getElementById("audit-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "audit-modal";
      modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:100%;max-width:780px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <h5 style="margin:0;font-weight:700;font-size:1.1rem;">🔐 Vote Audit</h5>
          <button id="close-audit-modal" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#6b7280;">✕</button>
        </div>
        <div id="audit-modal-body" style="overflow-y:auto;padding:24px;flex:1;">
          <div class="text-center py-4" style="color:#6b7280;">
            <div class="spinner-border spinner-border-sm me-2"></div>
            Verifying HMAC signatures...
          </div>
        </div>
      </div>
    `;

    modal.style.display = "flex";
    document.getElementById("close-audit-modal").addEventListener("click", () => {
      modal.style.display = "none";
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });

    try {
      const { summary, votes } = await auditVotesByEvent(eventId);
      const body = document.getElementById("audit-modal-body");

      const verdictBadge = (status) => {
        if (status === "VALID")    return `<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">✓ VALID</span>`;
        if (status === "NO_HASH")  return `<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">⚠ NO SIGNATURE</span>`;
        return                            `<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700;">✗ INVALID</span>`;
      };

      const invalidAlert = summary.invalid > 0
          ? `<div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:12px 16px;margin-bottom:16px;color:#991b1b;font-size:.875rem;">
             ⚠️ <strong>${summary.invalid} voto(s) con firma inválida detectados.</strong>
             Estos votos pudieron haber sido modificados o insertados directamente en la base de datos.
           </div>`
          : "";

      const noHashAlert = summary.no_hash > 0
          ? `<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;padding:12px 16px;margin-bottom:16px;color:#92400e;font-size:.875rem;">
             ℹ️ <strong>${summary.no_hash} voto(s) sin firma HMAC.</strong>
             Fueron registrados antes de activar el sistema de auditoría.
           </div>`
          : "";

      const rows = votes.map((v, i) => `
        <tr style="border-bottom:1px solid #f3f4f6;${v.status === "INVALID" ? "background:#fff5f5;" : ""}">
          <td style="padding:8px 12px;color:#9ca3af;">${i + 1}</td>
          <td style="padding:8px 12px;font-weight:600;">${v.project_name ?? "—"}</td>
          <td style="padding:8px 12px;">
            <span style="background:${v.voter_role === "STAFF" ? "#ede9fe" : "#e0f2fe"};color:${v.voter_role === "STAFF" ? "#7c3aed" : "#0369a1"};padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:700;">
              ${v.voter_role}
            </span>
          </td>
          <td style="padding:8px 12px;color:#374151;font-size:.8rem;">${v.voter_documento ?? '—'}</td>
          <td style="padding:8px 12px;color:#374151;font-size:.8rem;">${v.voter_nombre ?? '—'}</td>
          <td style="padding:8px 12px;color:#6b7280;font-family:monospace;font-size:.75rem;">${v.voter_ip ?? "—"}</td>
          <td style="padding:8px 12px;color:#6b7280;font-size:.75rem;">${v.voted_at ? new Date(v.voted_at).toLocaleString("es-CO") : "—"}</td>
          <td style="padding:8px 12px;">${verdictBadge(v.status)}</td>
        </tr>
      `).join("");

      body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
          <div style="background:#d1fae5;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:1.6rem;font-weight:800;color:#065f46;">${summary.valid}</div>
            <div style="font-size:.8rem;color:#065f46;font-weight:600;">Valid</div>
          </div>
          <div style="background:#fef3c7;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:1.6rem;font-weight:800;color:#92400e;">${summary.no_hash}</div>
            <div style="font-size:.8rem;color:#92400e;font-weight:600;">No Signature</div>
          </div>
          <div style="background:#fee2e2;border-radius:12px;padding:14px;text-align:center;">
            <div style="font-size:1.6rem;font-weight:800;color:#991b1b;">${summary.invalid}</div>
            <div style="font-size:.8rem;color:#991b1b;font-weight:600;">Invalid</div>
          </div>
        </div>
        ${invalidAlert}
        ${noHashAlert}
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
            <thead>
              <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">#</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">Project</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">Role</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">Cédula</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">Nombre</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">IP</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">Date</th>
                <th style="padding:8px 12px;text-align:left;font-weight:700;color:#374151;">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${votes.length === 0 ? '<p style="text-align:center;color:#9ca3af;padding:24px 0;">No votes registered.</p>' : ""}
        </div>
      `;
    } catch (err) {
      document.getElementById("audit-modal-body").innerHTML = `
        <div style="color:#ef4444;text-align:center;padding:24px;">
          Error loading audit: ${err.message}
        </div>
      `;
    }
  }
}