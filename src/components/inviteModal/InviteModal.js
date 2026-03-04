import {
  getAvailableCoders,
  inviteMember,
  getTeamJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} from "../../services/api.js";

/**
 * Reusable invite-member modal.
 * Usage:
 *   const modal = new InviteModal({ team, onMemberAdded });
 *   document.body.appendChild(modal.element());
 *   modal.open();
 */
export default class InviteModal {
  constructor({ team, onMemberAdded = null } = {}) {
    this.team = team;
    this.onMemberAdded = onMemberAdded;
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
    this._el.style.display = "flex";
    this._el.querySelector("#inviteSearchInput")?.focus();
    this._loadJoinRequests();
  }

  close() {
    if (!this._el) return;
    this._el.style.display = "none";
    const input = this._el.querySelector("#inviteSearchInput");
    if (input) input.value = "";
    const listEl = this._el.querySelector("#inviteCodersList");
    if (listEl)
      listEl.innerHTML = `<p class="invite-hint">Escribe para buscar coders disponibles.</p>`;
  }

  /** Call this if the team reference changes after construction */
  setTeam(team) {
    this.team = team;
  }

  // ── Private ────────────────────────────────────────

  _template() {
    return `
      <div id="inviteModalBackdrop" class="invite-modal-backdrop" style="display:none;">
        <div class="invite-modal" role="dialog" aria-modal="true">
          <div class="invite-modal-header">
            <h3 class="invite-modal-title">Invitar miembro</h3>
            <button id="inviteModalClose" class="invite-modal-close" aria-label="Cerrar">✕</button>
          </div>
          <div class="invite-modal-body">
            <div id="joinRequestsSection" class="join-requests-section" style="display:none;">
              <h4 style="font-size:0.9rem;margin-bottom:0.5rem;color:#6366f1;">📥 Solicitudes de unión pendientes</h4>
              <div id="joinRequestsList" class="join-requests-list"></div>
              <hr style="margin:1rem 0;" />
            </div>
            <input id="inviteSearchInput" type="text" class="invite-search-input"
                   placeholder="Buscar coder por nombre o email…" />
            <div id="inviteCodersList" class="invite-coders-list">
              <p class="invite-hint">Escribe para buscar coders disponibles.</p>
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
              Aceptar
            </button>
            <button class="btn-reject-join-request pib-btn pib-reject"
                    data-request-id="${req.id_request}">
              Rechazar
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
    btn.textContent = "Aceptando…";
    try {
      await acceptJoinRequest(btn.dataset.requestId);
      btn.closest(".join-request-item")?.remove();
      this.onMemberAdded?.();
      this._checkEmptyRequests();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Aceptar";
      this._showError(err?.message ?? "No se pudo aceptar la solicitud.");
    }
  }

  async _rejectRequest(btn) {
    btn.disabled = true;
    btn.textContent = "Rechazando…";
    try {
      await rejectJoinRequest(btn.dataset.requestId);
      btn.closest(".join-request-item")?.remove();
      this._checkEmptyRequests();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Rechazar";
      this._showError(err?.message ?? "No se pudo rechazar la solicitud.");
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

    if (!query.trim()) {
      listEl.innerHTML = `<p class="invite-hint">Escribe para buscar coders disponibles.</p>`;
      return;
    }

    listEl.innerHTML = `<p class="invite-hint">Buscando…</p>`;

    try {
      const res = await getAvailableCoders(this.team.id_team, query);
      const data = res?.data ?? res;
      const coders = data?.coders ?? [];

      if (coders.length === 0) {
        listEl.innerHTML = `<p class="invite-hint">No se encontraron coders disponibles.</p>`;
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
              ? `<span class="invite-status-pending">Invitado</span>`
              : `<button class="invite-btn-send" data-user-id="${c.id_user}">Invitar</button>`
          }
        </div>
      `,
        )
        .join("");

      listEl.querySelectorAll(".invite-btn-send").forEach((btn) => {
        btn.addEventListener("click", () => this._sendInvite(btn));
      });
    } catch (err) {
      listEl.innerHTML = `<p class="invite-hint invite-error">${_esc(err?.message ?? "Error al buscar.")}</p>`;
    }
  }

  async _sendInvite(btn) {
    const userId = btn.dataset.userId;
    if (!this.team?.id_team || !userId) return;

    btn.disabled = true;
    btn.textContent = "Enviando…";

    try {
      await inviteMember(this.team.id_team, Number(userId));
      btn.textContent = "✓ Invitado";
      btn.classList.add("invite-status-pending");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Invitar";
      this._showError(err?.message ?? "No se pudo enviar la invitación.");
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
