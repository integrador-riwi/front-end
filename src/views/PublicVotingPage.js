import "../assets/styles/voting.css";
import { submitVote, getVotingProjects, getStaffVotingProjects, checkCedulaVoted } from "../services/api.js";
import { t, onLangChange } from "../utils/i18n.js";

export default class PublicVotingPage {
  constructor(app, params) {
    this.app = app;
    this.eventId = params.eventId;
    this.staffToken = params.staffToken ?? null;
    this.isStaff = params.isStaff ?? !!this.staffToken;
    this._offLangChange = null;
    this.event = null;
    this.ranking = [];        // all teams from server
    this.podium = [null, null, null]; // [1st, 2nd, 3rd]
    this.bench = [];          // teams not yet on podium
    this.qrVoteId = null;
    this.dragging = null;     // { team, from: 'bench'|'podium', index }

    // Voter identity — collected before voting
    this.voterIdentified = false;
    this.voterDocumento = null;
    this.voterNombre = null;
  }

  /* ── FETCH ──────────────────────────────────────────────── */

  async fetchEvent() {
    try {
      const parts = window.location.pathname.split("/");
      this.event = parts[parts.length - 1];
    } catch (e) { console.error(e); }
  }

  async fetchRanking() {
    try {
      const res = this.isStaff
          ? await getStaffVotingProjects(this.staffToken)
          : await getVotingProjects(this.eventId);

      this.ranking = res?.projects || [];
      this.bench = [...this.ranking];
      this.podium = [null, null, null];
      this.qrVoteId = res?.qr_vote_id;
      sessionStorage.setItem("qrVoteId", JSON.stringify(this.qrVoteId));

      const key = this.isStaff
          ? `voter_token_staff_${this.staffToken}`
          : `voter_token_${this.eventId}`;
      if (!localStorage.getItem(key)) localStorage.setItem(key, crypto.randomUUID());
    } catch (e) {
      console.error(e);
      this.ranking = [];
      this.bench = [];
    }
  }

  /* ── VOTE SUBMIT ────────────────────────────────────────── */

  hasAlreadyVoted() {
    return !!(
        localStorage.getItem(`voted_staff_${this.staffToken}`) ||
        localStorage.getItem(`voted_event_${this.eventId}`)
    );
  }

  async handleVote() {
    const first = this.podium[0];
    if (!first) return;
    const btn = document.getElementById("submit-vote-btn");
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="v-spinner"></span> ${t("publicVoting.submitting")}`; }
    try {
      const qrVoteId = JSON.parse(sessionStorage.getItem("qrVoteId"));
      const key = this.isStaff
          ? `voter_token_staff_${this.staffToken}`
          : `voter_token_${this.eventId}`;
      // Build podium: [{project_id, position}] — pos1=3pts, pos2=2pts, pos3=1pt
      const podium = this.podium
          .map((team, i) => team ? { project_id: Number(team.id_project), position: i + 1 } : null)
          .filter(Boolean);

      await submitVote(
        qrVoteId,
        Number(first.id_project),
        localStorage.getItem(key),
        podium,
        { documento: this.voterDocumento, nombre: this.voterNombre }
      );
      const votedKey = this.isStaff ? `voted_staff_${this.staffToken}` : `voted_event_${this.eventId}`;
      localStorage.setItem(votedKey, "true");
      this.showSuccess(first.team_name);
    } catch (e) {
      console.error(e);
      if (btn) { btn.disabled = false; btn.innerHTML = this._btnLabel(); }
      const msg = e?.message?.includes('cédula')
        ? t("publicVoting.alreadyVotedDocument")
        : (t("publicVoting.voteError") || "Error submitting vote.");
      this.showToast(msg);
    }
  }

  _btnLabel() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${t("publicVoting.submitRanking")}`;
  }

  showSuccess(teamName) {
    // Create modal overlay — cannot be closed
    const overlay = document.createElement("div");
    overlay.className = "v-modal-overlay";
    overlay.innerHTML = `
      <div class="v-modal">
        <div class="v-modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 class="v-modal-title">${t("publicVoting.modalTitle")}</h2>
        <p class="v-modal-team">${teamName}</p>
        <p class="v-modal-sub">${t("publicVoting.modalSub")}</p>
        <div class="v-modal-countdown">
          <div class="v-modal-bar"><div class="v-modal-bar-fill" id="v-countdown-bar"></div></div>
          <span class="v-modal-seconds" id="v-countdown-num">5</span>
        </div>
      </div>`;

    // Block closing
    overlay.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("keydown", (e) => e.preventDefault());
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("v-modal-overlay--show"));

    // Countdown
    let seconds = 5;
    const numEl = document.getElementById("v-countdown-num");
    const barEl = document.getElementById("v-countdown-bar");

    // Animate bar
    requestAnimationFrame(() => {
      if (barEl) barEl.style.width = "0%";
    });

    const interval = setInterval(() => {
      seconds--;
      if (numEl) numEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(interval);
        window.location.href = "/";
      }
    }, 1000);
  }

  showToast(msg) {
    const el = document.createElement("div");
    el.className = "v-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("v-toast--show"));
    setTimeout(() => { el.classList.remove("v-toast--show"); setTimeout(() => el.remove(), 300); }, 3500);
  }

  /* ── RENDER ─────────────────────────────────────────────── */

  renderPodiumSlot(pos) {
    // pos: 0=1st, 1=2nd, 2=3rd
    const labels   = ["1st", "2nd", "3rd"];
    const heights  = ["h-first", "h-second", "h-third"];
    const orders   = [1, 0, 2]; // visual: 2nd left, 1st center, 3rd right
    const team = this.podium[pos];
    const colorIdx = pos + 1;

    if (team) {
      return `
        <div class="v-slot v-slot--filled ${heights[pos]}" data-slot="${pos}"
             draggable="true" data-from="podium" data-id="${team.id_project}"
             style="order:${orders[pos]}">
          <div class="v-slot-pos">${labels[pos]}</div>
          <div class="v-slot-avatar v-avatar--${colorIdx}">${team.team_name?.[0]?.toUpperCase() ?? "?"}</div>
          <div class="v-slot-name">${team.team_name}</div>
          <button class="v-slot-remove" data-slot="${pos}" title="${t("publicVoting.remove")}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>`;
    }

    return `
      <div class="v-slot v-slot--empty ${heights[pos]}" data-slot="${pos}" style="order:${orders[pos]}">
        <div class="v-slot-pos">${labels[pos]}</div>
        <div class="v-slot-drop-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
        <span class="v-slot-hint">${t("publicVoting.dropHere")}</span>
      </div>`;
  }

  renderBenchCard(team, index) {
    const colorIdx = (index % 6) + 1;
    return `
      <div class="v-bench-card" draggable="true"
           data-from="bench" data-id="${team.id_project}" data-bench-index="${index}">
        <div class="v-bench-avatar v-avatar--${colorIdx}">${team.team_name?.[0]?.toUpperCase() ?? "?"}</div>
        <div class="v-bench-info">
          <span class="v-bench-name">${team.team_name}</span>
          ${team.project_name ? `<span class="v-bench-sub">${team.project_name}</span>` : ""}
        </div>
        <div class="v-bench-drag">
          <svg viewBox="0 0 10 16" fill="currentColor" width="10" height="16">
            <circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/>
            <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
            <circle cx="3" cy="14" r="1.5"/><circle cx="7" cy="14" r="1.5"/>
          </svg>
        </div>
      </div>`;
  }

  /* ── IDENTITY SCREEN ────────────────────────────────────── */

  _identityStorageKey() {
    return this.isStaff
      ? `voter_identity_staff_${this.staffToken}`
      : `voter_identity_${this.eventId}`;
  }

  _loadSavedIdentity() {
    try {
      const saved = sessionStorage.getItem(this._identityStorageKey());
      if (saved) {
        const { documento, nombre } = JSON.parse(saved);
        if (documento && nombre) {
          this.voterDocumento = documento;
          this.voterNombre    = nombre;
          this.voterIdentified = true;
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  _saveIdentity(documento, nombre) {
    this.voterDocumento  = documento.trim();
    this.voterNombre     = nombre.trim();
    this.voterIdentified = true;
    sessionStorage.setItem(
      this._identityStorageKey(),
      JSON.stringify({ documento: this.voterDocumento, nombre: this.voterNombre })
    );
  }

  buildIdentityScreen() {
    return `
      <div class="v-page" id="vote-wrap">
        <div class="v-header">
          <div class="v-logo">
            <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          <div class="v-header-text">
            <h1 class="v-title">${t("publicVoting.identityTitle")}</h1>
            <p class="v-subtitle">${t("publicVoting.identitySubtitle")}</p>
          </div>
        </div>

        <div class="v-identity-wrap">
          <div class="v-identity-card">
            <div class="v-identity-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 class="v-identity-title">${t("publicVoting.identifyTitle")}</h2>
            <p class="v-identity-sub">${t("publicVoting.identifySub")}</p>

            <div class="v-identity-form" id="identity-form">
              <div class="v-field">
                <label class="v-label" for="id-documento">${t("publicVoting.document")}</label>
                <input
                  class="v-input"
                  id="id-documento"
                  type="text"
                  inputmode="numeric"
                  placeholder="${t("publicVoting.documentPlaceholder")}"
                  maxlength="12"
                  autocomplete="off"
                />
                <span class="v-field-error" id="err-documento"></span>
              </div>

              <div class="v-field">
                <label class="v-label" for="id-nombre">${t("publicVoting.name")}</label>
                <input
                  class="v-input"
                  id="id-nombre"
                  type="text"
                  placeholder="${t("publicVoting.namePlaceholder")}"
                  maxlength="80"
                  autocomplete="off"
                />
                <span class="v-field-error" id="err-nombre"></span>
              </div>

              <button class="v-submit" id="identity-submit-btn" disabled>
                ${t("publicVoting.continue")}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  attachIdentityHandlers(container) {
    const docInput  = document.getElementById("id-documento");
    const nameInput = document.getElementById("id-nombre");
    const submitBtn = document.getElementById("identity-submit-btn");
    const errDoc    = document.getElementById("err-documento");
    const errName   = document.getElementById("err-nombre");

    const validate = () => {
      const doc  = docInput.value.trim();
      const name = nameInput.value.trim();
      const docOk  = /^\d{6,12}$/.test(doc);
      const nameOk = name.length >= 3;

      errDoc.textContent  = doc.length > 0 && !docOk  ? t("publicVoting.documentError") : "";
      errName.textContent = name.length > 0 && !nameOk ? t("publicVoting.nameError") : "";

      submitBtn.disabled = !(docOk && nameOk);
    };

    docInput.addEventListener("input",  validate);
    nameInput.addEventListener("input", validate);

    // Allow only digits in document field
    docInput.addEventListener("keypress", (e) => {
      if (!/[0-9]/.test(e.key)) e.preventDefault();
    });

    submitBtn.addEventListener("click", async () => {
      const doc  = docInput.value.trim();
      const name = nameInput.value.trim();
      if (!/^\d{6,12}$/.test(doc) || name.length < 3) return;

      // Verificar si la cédula ya votó antes de mostrar el podio
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="v-spinner"></span> ${t("publicVoting.verifying")}`;

      try {
        const res = await checkCedulaVoted(this.qrVoteId, doc);
        if (res?.already_voted) {
          errDoc.textContent = t("publicVoting.alreadyVotedSession");
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${t("publicVoting.continue")} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>`;
          return;
        }
      } catch (_) {
        // Si falla la verificación, dejar pasar (el backend lo bloqueará al votar)
      }

      this._saveIdentity(doc, name);

      // Animate out → render voting page
      const wrap = document.getElementById("vote-wrap");
      if (wrap) {
        wrap.style.transition = "opacity 0.25s ease, transform 0.25s ease";
        wrap.style.opacity = "0";
        wrap.style.transform = "translateY(-8px)";
        setTimeout(() => {
          this._dragAttached  = false;
          this._touchAttached = false;
          container.innerHTML = this.buildPage();
          this.attachDragDrop();
          this.attachTouchDrag();
          document.getElementById("submit-vote-btn")?.addEventListener("click", () => this.handleVote());
        }, 250);
      }
    });

    // Auto-focus first field
    setTimeout(() => docInput.focus(), 100);
  }

  buildPage() {
    if (!this.ranking.length) {
      return `<div class="v-empty"><p>${t("publicVoting.noTeams") || "No teams available yet."}</p></div>`;
    }
    const voted = this.hasAlreadyVoted();
    const podiumComplete = this.podium.every(t => t !== null);

    return `
      <div class="v-page" id="vote-wrap">

        <!-- Header -->
        <div class="v-header">
          <div class="v-logo">
            <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          <div class="v-header-text">
            <h1 class="v-title">TeamUp Voting</h1>
            <p class="v-subtitle">Drag teams to the podium · your 1st place is your vote</p>
          </div>
        </div>

        <!-- Podium -->
        <div class="v-podium-wrap">
          <div class="v-podium" id="v-podium">
            ${[0, 1, 2].map(i => this.renderPodiumSlot(i)).join("")}
          </div>
          <!-- Podium bases -->
          <div class="v-podium-bases">
            <div class="v-base v-base--2nd" style="order:0">2nd</div>
            <div class="v-base v-base--1st" style="order:1">1st</div>
            <div class="v-base v-base--3rd" style="order:2">3rd</div>
          </div>
        </div>

        <!-- Bench -->
        ${this.bench.length ? `
          <div class="v-bench-section">
            <p class="v-bench-label">Drag a team to the podium</p>
            <div class="v-bench" id="v-bench">
              ${this.bench.map((team, i) => this.renderBenchCard(team, i)).join("")}
            </div>
          </div>` : `
          <div class="v-bench-section">
            <p class="v-bench-label v-bench-label--done">All teams placed on the podium</p>
          </div>`
    }

        <!-- Footer -->
        <div class="v-footer">
          <div class="v-footer-inner">
            <button class="v-submit${!podiumComplete || voted ? " v-submit--done" : ""}"
                    id="submit-vote-btn" ${!podiumComplete || voted ? "disabled" : ""}>
              ${voted ? "✓ Already voted" : !podiumComplete ? "Fill all 3 podium spots to vote" : this._btnLabel()}
            </button>
          </div>
        </div>

      </div>`;
  }

  /* ── STATE MUTATIONS ────────────────────────────────────── */

  placeOnPodium(team, slotIndex, fromBench) {
    // If slot already occupied, send that team back to bench
    const displaced = this.podium[slotIndex];
    if (displaced) this.bench.push(displaced);

    // Remove from bench if coming from there
    if (fromBench) {
      this.bench = this.bench.filter(t => t.id_project !== team.id_project);
    } else {
      // Coming from another podium slot — clear that slot
      const oldSlot = this.podium.findIndex(t => t?.id_project === team.id_project);
      if (oldSlot !== -1) this.podium[oldSlot] = null;
    }

    this.podium[slotIndex] = team;
    this.refresh();
  }

  removeFromPodium(slotIndex) {
    const team = this.podium[slotIndex];
    if (!team) return;
    this.podium[slotIndex] = null;
    this.bench.push(team);
    this.refresh();
  }

  /* ── FULL REFRESH ───────────────────────────────────────── */

  refresh() {
    const podiumEl = document.getElementById("v-podium");
    const benchEl  = document.getElementById("v-bench");
    const btn      = document.getElementById("submit-vote-btn");
    const benchSection = document.querySelector(".v-bench-section");

    if (podiumEl) podiumEl.innerHTML = [0, 1, 2].map(i => this.renderPodiumSlot(i)).join("");

    if (benchSection) {
      if (this.bench.length) {
        benchSection.innerHTML = `
          <p class="v-bench-label">Drag a team to the podium</p>
          <div class="v-bench" id="v-bench">
            ${this.bench.map((team, i) => this.renderBenchCard(team, i)).join("")}
          </div>`;
      } else {
        benchSection.innerHTML = `<p class="v-bench-label v-bench-label--done">${t("publicVoting.allTeamsPlaced")}</p>`;
      }
    }

    const podiumComplete = this.podium.every(t => t !== null);
    const voted = this.hasAlreadyVoted();
    if (btn) {
      btn.disabled = !podiumComplete || voted;
      btn.className = `v-submit${!podiumComplete || voted ? " v-submit--done" : ""}`;
      btn.innerHTML = voted ? `✓ ${t("publicVoting.alreadyVoted")}` : !podiumComplete ? t("publicVoting.fillPodium") : this._btnLabel();
    }

    this.attachDragDrop();
  }

  /* ── DRAG & DROP (delegated — single listener set, survives re-renders) ── */

  getTeamById(id) {
    return this.ranking.find(t => String(t.id_project) === String(id));
  }

  _clearDragOver() {
    document.querySelectorAll(".v-slot--over").forEach(s => s.classList.remove("v-slot--over"));
    document.querySelectorAll(".v-bench--over").forEach(s => s.classList.remove("v-bench--over"));
  }

  attachDragDrop() {
    // Already attached via delegation on vote-wrap — skip re-attaching
    if (this._dragAttached) return;
    this._dragAttached = true;

    const root = document.getElementById("vote-wrap");
    if (!root) return;

    // dragstart — works on dynamically rendered children
    root.addEventListener("dragstart", (e) => {
      const el = e.target.closest("[draggable='true']");
      if (!el) return;
      this.dragging = {
        id: el.dataset.id,
        from: el.dataset.from,
        slotIndex: el.dataset.slot !== undefined ? parseInt(el.dataset.slot) : null,
      };
      el.classList.add("v-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", el.dataset.id);
    });

    root.addEventListener("dragend", (e) => {
      e.target.closest("[draggable='true']")?.classList.remove("v-dragging");
      this._clearDragOver();
    });

    root.addEventListener("dragover", (e) => {
      e.preventDefault();
      const slot  = e.target.closest(".v-slot");
      const bench = e.target.closest("#v-bench");
      this._clearDragOver();
      if (slot)  slot.classList.add("v-slot--over");
      if (bench) bench.classList.add("v-bench--over");
    });

    root.addEventListener("dragleave", (e) => {
      if (!root.contains(e.relatedTarget)) this._clearDragOver();
    });

    root.addEventListener("drop", (e) => {
      e.preventDefault();
      this._clearDragOver();
      if (!this.dragging) return;

      const slot  = e.target.closest(".v-slot");
      const bench = e.target.closest("#v-bench");

      if (slot) {
        const team = this.getTeamById(this.dragging.id);
        if (team) this.placeOnPodium(team, parseInt(slot.dataset.slot), this.dragging.from === "bench");
      } else if (bench && this.dragging.from === "podium") {
        this.removeFromPodium(this.dragging.slotIndex);
      }
      this.dragging = null;
    });

    // Click on filled podium slot (or its X button) → remove
    root.addEventListener("click", (e) => {
      // X button
      const btn = e.target.closest(".v-slot-remove");
      if (btn) {
        e.stopPropagation();
        this.removeFromPodium(parseInt(btn.dataset.slot));
        return;
      }
      // Click anywhere on a filled slot
      const slot = e.target.closest(".v-slot--filled");
      if (slot) this.removeFromPodium(parseInt(slot.dataset.slot));
    });
  }

  attachRemoveButtons() { /* handled by delegated click in attachDragDrop */ }

  /* ── TOUCH DRAG (delegated) ─────────────────────────────── */

  attachTouchDrag() {
    if (this._touchAttached) return;
    this._touchAttached = true;

    const root = document.getElementById("vote-wrap");
    if (!root) return;

    let td = null;   // touch dragging state
    let clone = null;

    const getSlotAt  = (x, y) => document.elementsFromPoint(x, y).reduce((f, el) => f || el.closest(".v-slot"), null);
    const getBenchAt = (x, y) => document.elementsFromPoint(x, y).some(el => el.closest("#v-bench"));

    let touchStartX = 0, touchStartY = 0, hasMoved = false;

    root.addEventListener("touchstart", (e) => {
      const el = e.target.closest("[draggable='true']");
      if (!el) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      hasMoved = false;
      const rect = el.getBoundingClientRect();
      td = { id: el.dataset.id, from: el.dataset.from, slotIndex: el.dataset.slot !== undefined ? parseInt(el.dataset.slot) : null };
      // Don't start clone yet — wait for move to confirm drag intent
    }, { passive: true });

    root.addEventListener("touchmove", (e) => {
      if (!td) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);

      // Only activate drag after 8px movement
      if (!hasMoved && dx < 8 && dy < 8) return;
      hasMoved = true;

      // Prevent page scroll while dragging
      e.preventDefault();

      if (!clone) {
        // Create clone now that we know it's a real drag
        const el = document.querySelector(`[data-id="${td.id}"][data-from="${td.from}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          el.classList.add("v-dragging");
          clone = el.cloneNode(true);
          clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;
            z-index:9999;pointer-events:none;opacity:0.88;transform:scale(1.04) rotate(1.5deg);
            box-shadow:0 16px 40px rgba(107,92,255,0.25);border-radius:14px;`;
          document.body.appendChild(clone);
        }
      }

      if (clone) {
        clone.style.top  = `${touch.clientY - 30}px`;
        clone.style.left = `${touch.clientX - 60}px`;
      }
      this._clearDragOver();
      const slot = getSlotAt(touch.clientX, touch.clientY);
      if (slot) slot.classList.add("v-slot--over");
    }, { passive: false });

    root.addEventListener("touchend", (e) => {
      this._clearDragOver();
      document.querySelectorAll(".v-dragging").forEach(el => el.classList.remove("v-dragging"));
      if (clone) { clone.remove(); clone = null; }
      if (!td) return;

      // Only process drop if user actually dragged
      if (hasMoved) {
        const touch = e.changedTouches[0];
        const slot  = getSlotAt(touch.clientX, touch.clientY);
        if (slot) {
          const team = this.getTeamById(td.id);
          if (team) this.placeOnPodium(team, parseInt(slot.dataset.slot), td.from === "bench");
        } else if (td.from === "podium" && getBenchAt(touch.clientX, touch.clientY)) {
          this.removeFromPodium(td.slotIndex);
        }
      }

      td = null;
      hasMoved = false;
    }, { passive: true });
  }

  /* ── MAIN RENDER ────────────────────────────────────────── */

  async render(container) {
    await this.fetchEvent();
    await this.fetchRanking();

    if (!this.isStaff && !this.event) {
      container.innerHTML = `<div class="v-empty"><h2>${t("publicVoting.eventNotFoundTitle")}</h2><p>${t("publicVoting.eventNotFoundDesc")}</p></div>`;
      return;
    }

    this._dragAttached  = false;
    this._touchAttached = false;

    // If voter not identified yet, show identity screen first
    this._loadSavedIdentity();
    if (!this.isStaff && !this.voterIdentified) {
      container.innerHTML = this.buildIdentityScreen();
      this.attachIdentityHandlers(container);
      this._offLangChange = onLangChange(() => this.render(container));
      return;
    }

    container.innerHTML = this.buildPage();
    this.attachDragDrop();
    this.attachTouchDrag();

    document.getElementById("submit-vote-btn")?.addEventListener("click", () => this.handleVote());
    this._offLangChange = onLangChange(() => this.render(container));
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
