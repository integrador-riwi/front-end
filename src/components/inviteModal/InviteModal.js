import {
  getAvailableCoders,
  inviteMember,
  closeTeam,
  reopenTeam,
  getTeamJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} from "../../services/api.js";
import { toast } from "../Toast/index.js";
import { t } from "../../utils/i18n.js";

/**
 * Reusable invite-member modal.
 * Usage:
 *   const modal = new InviteModal({ team, onMemberAdded });
 *   document.body.appendChild(modal.element());
 *   modal.open();
 */
export default class InviteModal {
  constructor({
    team,
    onMemberAdded = null,
    canCloseTeam = false,
    onTeamClosed = null,
    onTeamReopened = null,
  } = {}) {
    this.team = team;
    this.onMemberAdded = onMemberAdded;
    this.canCloseTeam = canCloseTeam;
    this.onTeamClosed = onTeamClosed;
    this.onTeamReopened = onTeamReopened;
    this._debounceTimer = null;
    this._el = null;
  }

  // ── Public ─────────────────────────────────────────

  /** Returns the backdrop DOM element (inserts once) */
  element() {
    if (this._el) return this._el;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = this._template();
    this._el = wrapper.firstElementChild;

    this._bindStaticEvents();
    return this._el;
  }

  open() {
    if (!this._el) return;
    this._syncTeamCloseState();
    this._el.style.display = "flex";
    this._el.querySelector("#inviteSearchInput")?.focus();
    if (!this.team?.closed_at) this._loadJoinRequests();
  }

  close() {
    if (!this._el) return;
    this._el.style.display = "none";
    const input = this._el.querySelector("#inviteSearchInput");
    if (input) input.value = "";
    const listEl = this._el.querySelector("#inviteCodersList");
    if (listEl)
      listEl.innerHTML = `<p class="invite-hint">${t("invite.searchHint")}</p>`;
  }

  /** Call this if the team reference changes after construction */
  setTeam(team) {
    this.team = team;
    this._syncTeamCloseState();
  }

  // ── Private ────────────────────────────────────────

  _template() {
    return `
      <div id="inviteModalBackdrop" class="invite-modal-backdrop" style="display:none;">
        <div class="invite-modal" role="dialog" aria-modal="true">
          <div class="invite-modal-header">
            <h3 class="invite-modal-title">${t("invite.inviteMemberHeading")}</h3>
            <button id="inviteModalClose" class="invite-modal-close" aria-label="${t("invite.closeModal")}">✕</button>
          </div>
          <div class="invite-modal-body">
            <div id="inviteCloseTeamSection" class="invite-close-team-section" style="display:none;">
              <div>
                <strong>Cerrar equipo</strong>
                <span>Oculta el equipo de la lista open y bloquea nuevas invitaciones o solicitudes.</span>
              </div>
              <button id="inviteCloseTeamBtn" class="invite-btn-close-team" type="button">
                Cerrar equipo
              </button>
            </div>
            <div id="inviteClosedTeamNotice" class="invite-closed-team-notice" style="display:none;">
              <div>
                <strong>Equipo cerrado</strong>
                <span>Este equipo ya no acepta nuevos participantes.</span>
              </div>
              <button id="inviteReopenTeamBtn" class="invite-btn-reopen-team" type="button">
                Reabrir equipo
              </button>
            </div>
            <div id="joinRequestsSection" class="join-requests-section" style="display:none;">
              <h4 style="font-size:0.9rem;margin-bottom:0.5rem;color:#6366f1;">📥 ${t("invite.pendingJoinRequests")}</h4>
              <div id="joinRequestsList" class="join-requests-list"></div>
              <hr style="margin:1rem 0;" />
            </div>
            <input id="inviteSearchInput" type="text" class="invite-search-input"
                   placeholder="${t("invite.searchPlaceholder")}" />
            <div id="inviteCodersList" class="invite-coders-list">
              <p class="invite-hint">${t("invite.searchHint")}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _bindStaticEvents() {
    const backdrop = this._el;
    const modal = backdrop.querySelector(".invite-modal");
    const closeBtn = backdrop.querySelector("#inviteModalClose");
    const searchInput = backdrop.querySelector("#inviteSearchInput");
    const closeTeamBtn = backdrop.querySelector("#inviteCloseTeamBtn");
    const reopenTeamBtn = backdrop.querySelector("#inviteReopenTeamBtn");

    // Close only when clicking the backdrop itself
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) this.close();
    });

    // Prevent clicks inside modal from bubbling to backdrop
    modal?.addEventListener("click", (e) => e.stopPropagation());

    closeBtn?.addEventListener("click", () => this.close());

    // Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop.style.display === "flex") this.close();
    });

    searchInput?.addEventListener("input", (e) => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(
        () => this._fetchCoders(e.target.value),
        400,
      );
    });

    closeTeamBtn?.addEventListener("click", () => this._closeTeam());
    reopenTeamBtn?.addEventListener("click", () => this._reopenTeam());
  }

  _syncTeamCloseState() {
    if (!this._el) return;

    const canClose = this.canCloseTeam && this.team?.id_team;
    const isClosed = !!this.team?.closed_at;
    const closeSection = this._el.querySelector("#inviteCloseTeamSection");
    const closedNotice = this._el.querySelector("#inviteClosedTeamNotice");
    const closeBtn = this._el.querySelector("#inviteCloseTeamBtn");
    const reopenBtn = this._el.querySelector("#inviteReopenTeamBtn");
    const searchInput = this._el.querySelector("#inviteSearchInput");
    const codersList = this._el.querySelector("#inviteCodersList");
    const requestsSection = this._el.querySelector("#joinRequestsSection");

    if (closeSection) {
      closeSection.style.display = canClose && !isClosed ? "flex" : "none";
    }
    if (closedNotice) {
      closedNotice.style.display = canClose && isClosed ? "flex" : "none";
    }
    if (closeBtn && !isClosed) {
      closeBtn.disabled = false;
      closeBtn.textContent = "Cerrar equipo";
    }
    if (reopenBtn && isClosed) {
      reopenBtn.disabled = false;
      reopenBtn.textContent = "Reabrir equipo";
    }
    if (searchInput) {
      searchInput.disabled = isClosed;
      searchInput.style.display = isClosed ? "none" : "";
    }
    if (codersList && isClosed) {
      codersList.innerHTML = `<p class="invite-hint">El equipo está cerrado.</p>`;
    } else if (codersList && !isClosed) {
      codersList.innerHTML = `<p class="invite-hint">${t("invite.searchHint")}</p>`;
    }
    if (requestsSection && isClosed) {
      requestsSection.style.display = "none";
    }
  }

  async _closeTeam() {
    if (!this.team?.id_team || this.team.closed_at) return;

    const confirmed = confirm(
      `¿Cerrar ${this.team.name ?? "este equipo"}? Ya no aceptará nuevos participantes.`,
    );
    if (!confirmed) return;

    const btn = this._el.querySelector("#inviteCloseTeamBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Cerrando...";
    }

    try {
      const res = await closeTeam(this.team.id_team);
      const closedAt =
        res?.data?.team?.closed_at ?? res?.team?.closed_at ?? new Date().toISOString();
      this.team = { ...this.team, closed_at: closedAt };
      this._syncTeamCloseState();
      this.onTeamClosed?.(this.team);
      toast.success("Equipo cerrado", "Ya no aparecerá como open.");
    } catch (err) {
      toast.error("Error", err?.message ?? "No se pudo cerrar el equipo.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Cerrar equipo";
      }
    }
  }

  async _reopenTeam() {
    if (!this.team?.id_team || !this.team.closed_at) return;

    const btn = this._el.querySelector("#inviteReopenTeamBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Reabriendo...";
    }

    try {
      const res = await reopenTeam(this.team.id_team);
      const reopenedTeam = res?.data?.team ?? res?.team ?? {};
      this.team = { ...this.team, ...reopenedTeam, closed_at: null };
      this._syncTeamCloseState();
      this._loadJoinRequests();
      this.onTeamReopened?.(this.team);
      toast.success("Equipo reabierto", "Ya puede recibir participantes otra vez.");
    } catch (err) {
      toast.error("Error", err?.message ?? "No se pudo reabrir el equipo.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Reabrir equipo";
      }
    }
  }

  async _loadJoinRequests() {
    if (!this.team) return;
    try {
      const res = await getTeamJoinRequests(this.team.id_team);
      const requests = res?.data ?? res ?? [];
      const section = this._el.querySelector("#joinRequestsSection");
      const list = this._el.querySelector("#joinRequestsList");

      if (!section || !list) return;

      if (requests.length === 0) {
        section.style.display = "none";
        return;
      }

      section.style.display = "block";
      list.innerHTML = requests
        .map(
          (req) => `
        <div class="join-request-item">
          <div>
            <strong>${_esc(req.user_name)}</strong>
            <span class="join-request-email">(${_esc(req.user_email)})</span>
          </div>
          <div class="pib-actions">
            <button class="btn-accept-join-request pib-btn pib-accept"
                    data-request-id="${req.id_request}">
              ${t("invite.accept")}
            </button>
            <button class="btn-reject-join-request pib-btn pib-reject"
                    data-request-id="${req.id_request}">
              ${t("invite.reject")}
            </button>
          </div>
        </div>
      `,
        )
        .join("");

      list.querySelectorAll(".btn-accept-join-request").forEach((btn) => {
        btn.addEventListener("click", () => this._acceptRequest(btn));
      });
      list.querySelectorAll(".btn-reject-join-request").forEach((btn) => {
        btn.addEventListener("click", () => this._rejectRequest(btn));
      });
    } catch (err) {
      console.error("Error loading join requests:", err);
    }
  }

  async _acceptRequest(btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="invite-btn-spinner"></span>`;
    try {
      await acceptJoinRequest(btn.dataset.requestId);
      btn.closest(".join-request-item")?.remove();
      this.onMemberAdded?.();
      this._checkEmptyRequests();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t("invite.accept");
      this._showError(err?.message ?? t("invite.errorAcceptRequest"));
    }
  }

  async _rejectRequest(btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="invite-btn-spinner"></span>`;
    try {
      await rejectJoinRequest(btn.dataset.requestId);
      btn.closest(".join-request-item")?.remove();
      this._checkEmptyRequests();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t("invite.reject");
      this._showError(err?.message ?? t("invite.errorRejectRequest"));
    }
  }

  _checkEmptyRequests() {
    const section = this._el.querySelector("#joinRequestsSection");
    const list = this._el.querySelector("#joinRequestsList");
    if (section && list && list.children.length === 0) {
      section.style.display = "none";
    }
  }

  async _fetchCoders(query) {
    const listEl = this._el.querySelector("#inviteCodersList");
    if (!listEl || !this.team) return;

    if (this.team.closed_at) {
      listEl.innerHTML = `<p class="invite-hint">El equipo está cerrado.</p>`;
      return;
    }

    if (!query.trim()) {
      listEl.innerHTML = `<p class="invite-hint">${t("invite.searchHint")}</p>`;
      return;
    }

    listEl.innerHTML = `<div class="invite-searching"><span class="invite-spinner"></span></div>`;

    try {
      const res = await getAvailableCoders(this.team.id_team, query);
      const data = res?.data ?? res;
      const coders = data?.coders ?? [];

      if (coders.length === 0) {
        listEl.innerHTML = `<p class="invite-hint">${t("invite.noCodersFound")}</p>`;
        return;
      }

      listEl.innerHTML = coders
        .map(
          (c) => `
        <div class="invite-coder-item">
          <div class="invite-coder-avatar">${c.name?.charAt(0) ?? "?"}</div>
          <div class="invite-coder-info">
            <span class="invite-coder-name">${_esc(c.name)}</span>
            <span class="invite-coder-email">${_esc(c.email)}</span>
          </div>
          ${
            c.hasPendingInvitation
              ? `<span class="invite-status-pending">${t("invite.invitedBadge")}</span>`
              : `<button class="invite-btn-send" data-user-id="${c.id_user}">${t("invite.inviteBtn")}</button>`
          }
        </div>
      `,
        )
        .join("");

      listEl.querySelectorAll(".invite-btn-send").forEach((btn) => {
        btn.addEventListener("click", () => this._sendInvite(btn));
      });
    } catch (err) {
      toast.error(
        t("common.errorTitle"),
        err?.message ?? t("invite.errorSearching"),
      );
    }
  }

  async _sendInvite(btn) {
    const userId = btn.dataset.userId;
    if (!this.team?.id_team || !userId) return;

    if (this.team.closed_at) {
      this._showError("El equipo está cerrado y no acepta nuevos participantes.");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="invite-btn-spinner"></span>`;

    try {
      await inviteMember(this.team.id_team, Number(userId));
      btn.textContent = t("invite.invitedSuccess");
      btn.classList.add("invite-status-pending");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t("invite.inviteBtn");
      this._showError(err?.message ?? t("invite.errorSendInvite"));
    }
  }

  _showError(message) {
    const body = this._el.querySelector(".invite-modal-body");
    if (!body) return;
    let errEl = body.querySelector(".invite-modal-error");
    if (!errEl) {
      errEl = document.createElement("p");
      errEl.className = "invite-modal-error";
      errEl.style.cssText =
        "color:#dc2626;font-size:0.85rem;margin-bottom:0.5rem;";
      body.insertBefore(errEl, body.firstChild);
    }
    errEl.textContent = message;
    setTimeout(() => errEl?.remove(), 4000);
  }
}

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
