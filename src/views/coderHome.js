import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar";
import { renderCoderTeam, loadProjectBrief } from "./coderTeam.js";
import { renderCoderNoTeam, setupAIAnalysis } from "./coderNoTeam.js";
import { getUser } from "../utils/auth";
import {
  createTeam as createTeamRequest,
  apiFetch,
  getAvailableCoders,
  inviteMember,
  acceptInvitation,
  rejectInvitation,
  leaveTeam,
} from "../services/api.js";

export default class CoderHome {
  constructor(router, { user, team } = {}) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.user = getUser();
    this.team = team || null;

    this.searchQuery = "";

    this.aiResult = null;
    this.isAnalyzing = false;
    this.isCreatingTeam = false;
    this.createTeamError = "";
    this.createTeamSuccess = "";
    this.pendingInvitations = [];
    this._pollingInterval = null;
    this._pollingInterval = null;

    // Store form values to prevent clearing on re-render
    this.formData = {
      teamName: "",
      projectTopic: "",
    };

    this.teams = [
      {
        id: 1,
        name: "Quantum Leap",
        description:
          "Exploring quantum computing algorithms for financial models.",
        status: "full",
        members: [
          { id: 1, name: "Alice", avatar: "A" },
          { id: 2, name: "Bob", avatar: "B" },
          { id: 3, name: "Carol", avatar: "C" },
          { id: 4, name: "Dave", avatar: "D" },
        ],
        maxMembers: 6,
      },
      {
        id: 2,
        name: "Alpha Squad",
        description: "Building a React Native app for campus navigation.",
        status: "open",
        members: [
          { id: 5, name: "Emma", avatar: "E" },
          { id: 6, name: "Frank", avatar: "F" },
        ],
        maxMembers: 6,
      },
      {
        id: 3,
        name: "Data Miners",
        description:
          "Machine Learning project focusing on social media sentiment analysis.",
        status: "pending",
        members: [
          { id: 7, name: "Grace", avatar: "G" },
          { id: 8, name: "Henry", avatar: "H" },
          { id: 9, name: "Ivy", avatar: "I" },
        ],
        maxMembers: 6,
      },
    ];
  }

  // ─────────────────────────────────────────
  // Init — load team from API before rendering
  // ─────────────────────────────────────────
  async init() {
    try {
      const response = await apiFetch("/teams/my-teams", { method: "GET" });
      const data = response?.data ?? response;
      const teams = data?.teams ?? [];
      this.pendingInvitations = data?.pendingInvitations ?? [];

      if (teams.length > 0) {
        const t = teams[0];
        const teamDetail = await apiFetch(`/teams/${t.id_team}`, {
          method: "GET",
        });
        const full = teamDetail?.data ?? teamDetail;
        this.team = {
          ...full,
          members: full.members ?? [],
          project: full.project ?? null,
        };
      }

      // Load real available teams for the no-team view
      if (!this.team) {
        try {
          const teamsRes = await apiFetch("/teams?limit=50", { method: "GET" });
          const teamsData = teamsRes?.data ?? teamsRes;
          const rawTeams = teamsData?.teams ?? [];
          this.teams = rawTeams.map((t) => ({
            id: t.id_team,
            name: t.name,
            description: t.description ?? "No description.",
            status:
              parseInt(t.member_count) >= 5
                ? "full"
                : this.pendingInvitations.some(
                      (inv) => inv.id_team === t.id_team,
                    )
                  ? "pending"
                  : "open",
            members: Array.from(
              { length: parseInt(t.member_count) || 0 },
              (_, i) => ({
                id: i,
                name: "?",
                avatar: "?",
              }),
            ),
            maxMembers: 5,
          }));
        } catch (_) {
          // keep mock teams as fallback
        }
      }
    } catch (e) {
      this.team = null;
    }
    this.render();

    // Polling: solo si el usuario NO tiene equipo todavía
    if (!this.team) {
      this._startPolling();
    } else {
      this._stopPolling();
    }
  }

  // ─────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────
  render() {
    const app = document.getElementById("app");

    const content = this.team
      ? (() => {
          const html = renderCoderTeam({ user: this.user, team: this.team });
          setTimeout(() => loadProjectBrief(), 0);
          return html;
        })()
      : renderCoderNoTeam({
          user: this.user,
          teams: this.getFilteredTeams(),
          searchQuery: this.searchQuery,
          availableCount: this.getAvailableCount(),
          formData: this.formData,
          analyzeSimilarity: this.aiResult !== null || this.isAnalyzing,
          aiResult: this.aiResult,
          isAnalyzing: this.isAnalyzing,
          createTeamState: {
            isCreating: this.isCreatingTeam,
            error: this.createTeamError,
            success: this.createTeamSuccess,
          },
        });

    const pendingBanner =
      !this.team && this.pendingInvitations.length > 0
        ? this._renderPendingInvitationsBanner()
        : "";

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="coder-home-main">
        ${pendingBanner}
        ${content}
        ${this._renderInviteModal()}
      </main>
    `;

    this.navbar.attachEventHandlers();
    this.attachEventHandlers();

    if (!this.team) {
      setupAIAnalysis(this);
    }
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────
  getFilteredTeams() {
    if (!this.searchQuery.trim()) return this.teams;
    const q = this.searchQuery.toLowerCase();
    return this.teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }

  getAvailableCount() {
    return this.teams.filter((t) => t.status === "open").length;
  }

  // ─────────────────────────────────────────
  // Polling de invitaciones
  // ─────────────────────────────────────────
  _startPolling() {
    this._stopPolling(); // evitar duplicados
    this._pollingInterval = setInterval(
      () => this._checkNewInvitations(),
      10000,
    );
  }

  _stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
  }

  async _checkNewInvitations() {
    // Si el usuario ya tiene equipo, dejar de pollear
    if (this.team) {
      this._stopPolling();
      return;
    }
    try {
      const response = await apiFetch("/teams/my-teams", { method: "GET" });
      const data = response?.data ?? response;
      const newInvitations = data?.pendingInvitations ?? [];

      // Comparar por IDs — si hay alguna nueva, actualizar el banner
      const currentIds = this.pendingInvitations
        .map((i) => i.id_invitation)
        .sort()
        .join(",");
      const newIds = newInvitations
        .map((i) => i.id_invitation)
        .sort()
        .join(",");

      if (currentIds !== newIds) {
        this.pendingInvitations = newInvitations;
        this._updateInvitationsBanner();
      }
    } catch (_) {
      // silencioso — no interrumpir al usuario si falla el poll
    }
  }

  _updateInvitationsBanner() {
    const main = document.querySelector(".coder-home-main");
    if (!main) return;

    // Remover banner anterior si existe
    const existing = main.querySelector(".pending-invitations-banner");
    if (existing) existing.remove();

    // Insertar nuevo banner al inicio si hay invitaciones
    if (this.pendingInvitations.length > 0) {
      const bannerHtml = this._renderPendingInvitationsBanner();
      main.insertAdjacentHTML("afterbegin", bannerHtml);

      // Re-attach handlers solo del banner nuevo
      main.querySelectorAll(".btn-accept-invitation").forEach((btn) => {
        btn.addEventListener("click", () =>
          this.handleAcceptInvitation(btn.dataset.invitationId, btn),
        );
      });
      main.querySelectorAll(".btn-reject-invitation").forEach((btn) => {
        btn.addEventListener("click", () =>
          this.handleRejectInvitation(btn.dataset.invitationId),
        );
      });
    }
  }

  // ─────────────────────────────────────────
  // Polling de invitaciones (solo sin equipo)
  // ─────────────────────────────────────────
  _startPolling() {
    this._stopPolling();
    this._pollingInterval = setInterval(
      () => this._checkNewInvitations(),
      15000,
    );
  }

  _stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
  }

  async _checkNewInvitations() {
    if (this.team) {
      this._stopPolling();
      return;
    }
    try {
      const response = await apiFetch("/teams/my-teams", { method: "GET" });
      const data = response?.data ?? response;
      const newInvitations = data?.pendingInvitations ?? [];
      const currentIds = this.pendingInvitations
        .map((i) => i.id_invitation)
        .sort()
        .join(",");
      const newIds = newInvitations
        .map((i) => i.id_invitation)
        .sort()
        .join(",");
      if (currentIds !== newIds) {
        this.pendingInvitations = newInvitations;
        this._updateInvitationsBanner();
      }
    } catch (_) {
      /* silencioso */
    }
  }

  _updateInvitationsBanner() {
    const main = document.querySelector(".coder-home-main");
    if (!main) return;
    const existing = main.querySelector(".pending-invitations-banner");
    if (existing) existing.remove();
    if (this.pendingInvitations.length > 0) {
      main.insertAdjacentHTML(
        "afterbegin",
        this._renderPendingInvitationsBanner(),
      );
      main.querySelectorAll(".btn-accept-invitation").forEach((btn) => {
        btn.addEventListener("click", () =>
          this.handleAcceptInvitation(btn.dataset.invitationId, btn),
        );
      });
      main.querySelectorAll(".btn-reject-invitation").forEach((btn) => {
        btn.addEventListener("click", () =>
          this.handleRejectInvitation(btn.dataset.invitationId),
        );
      });
    }
  }

  // ─────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────
  attachEventHandlers() {
    // ── No-team view handlers ──
    document
      .getElementById("createTeamForm")
      ?.addEventListener("submit", (e) => this.handleCreateTeam(e));

    document.getElementById("teamSearch")?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.render();
    });

    document.querySelectorAll(".btn-join").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.handleJoinTeam(btn.dataset.teamId),
      );
    });

    // ── Pending invitations handlers ──
    document.querySelectorAll(".btn-accept-invitation").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.handleAcceptInvitation(btn.dataset.invitationId, btn),
      );
    });
    document.querySelectorAll(".btn-reject-invitation").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.handleRejectInvitation(btn.dataset.invitationId),
      );
    });

    // ── Team view handlers ──
    const btnProjectSettings = document.querySelector(".btn-project-settings");
    if (btnProjectSettings) {
      btnProjectSettings.addEventListener("click", (e) => {
        const route = e.currentTarget.dataset.route;
        if (route) {
          this.router.navigate(route);
        }
      });
    }

    // ── Add member button → open modal ──
    document.getElementById("addMemberBtn")?.addEventListener("click", () => {
      this._openInviteModal();
    });

    // ── Leave team button ──
    document
      .getElementById("leaveTeamBtn")
      ?.addEventListener("click", async () => {
        const confirmed = confirm(
          "¿Estás seguro de que quieres salir del equipo?",
        );
        if (!confirmed) return;

        try {
          await leaveTeam(this.team.id_team);
          this.team = null;
          this.render();
          this.attachEventHandlers();
        } catch (err) {
          alert(
            "Error al salir del equipo: " +
              (err?.message ?? "Intenta de nuevo"),
          );
        }
      });

    // ── Modal: close ──
    document
      .getElementById("inviteModalClose")
      ?.addEventListener("click", () => {
        this._closeInviteModal();
      });
    document
      .getElementById("inviteModalBackdrop")
      ?.addEventListener("click", () => {
        this._closeInviteModal();
      });

    // ── Modal: search input ──
    document
      .getElementById("inviteSearchInput")
      ?.addEventListener("input", (e) => {
        this._searchCoders(e.target.value);
      });
  }

  // ─────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────
  async handleCreateTeam(e) {
    e.preventDefault();
    const teamNameInput = document.getElementById("teamName");
    const projectTopicInput = document.getElementById("projectTopic");
    const rawTeamName = teamNameInput?.value ?? "";
    const teamName = rawTeamName.trim();
    const projectTopic = projectTopicInput?.value ?? "";

    this.formData = {
      teamName: rawTeamName,
      projectTopic,
    };

    if (!teamName) {
      this.createTeamError = "El nombre del equipo es obligatorio.";
      this.createTeamSuccess = "";
      this.render();
      return;
    }

    this.isCreatingTeam = true;
    this.createTeamError = "";
    this.createTeamSuccess = "";
    this.render();

    try {
      const response = await createTeamRequest({
        name: teamName,
        description: projectTopic,
      });
      const payload = response?.data ?? response;
      this.createTeamSuccess = `Equipo "${payload?.name ?? teamName}" creado correctamente.`;
      this.formData = { teamName: "", projectTopic: "" };

      if (payload) {
        this.team = {
          ...payload,
          members: payload.members ?? [],
          project: payload.project ?? null,
        };
      }
    } catch (error) {
      this.createTeamError =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo crear el equipo.";
      this.createTeamSuccess = "";
    } finally {
      this.isCreatingTeam = false;
      this.render();
    }
  }

  handleJoinTeam(teamId) {
    console.log("Join team:", teamId);
  }

  // ─────────────────────────────────────────
  // Pending invitations
  // ─────────────────────────────────────────
  async handleAcceptInvitation(invitationId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Aceptando…";
    }
    // Deshabilitar también el botón de rechazar de la misma invitación
    const rejectBtn = btn
      ?.closest(".pib-item")
      ?.querySelector(".btn-reject-invitation");
    if (rejectBtn) rejectBtn.disabled = true;

    try {
      await acceptInvitation(invitationId);
      await this.init(); // reload — user now has a team
    } catch (err) {
      // Restaurar botón si falla
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Aceptar";
      }
      if (rejectBtn) rejectBtn.disabled = false;
      alert(err?.message ?? "No se pudo aceptar la invitación.");
    }
  }

  async handleRejectInvitation(invitationId) {
    try {
      await rejectInvitation(invitationId);
      this.pendingInvitations = this.pendingInvitations.filter(
        (inv) => String(inv.id_invitation) !== String(invitationId),
      );
      this.render();
    } catch (err) {
      alert(err?.message ?? "No se pudo rechazar la invitación.");
    }
  }

  // ─────────────────────────────────────────
  // Invite-member modal
  // ─────────────────────────────────────────
  _renderPendingInvitationsBanner() {
    return `
      <div class="pending-invitations-banner">
        <p class="pib-title">📬 Tienes ${this.pendingInvitations.length} invitación(es) pendiente(s)</p>
        <div class="pib-list">
          ${this.pendingInvitations
            .map(
              (inv) => `
            <div class="pib-item">
              <span>Equipo: <strong>${inv.team_name ?? inv.id_team}</strong></span>
              <div class="pib-actions">
                <button class="btn-accept-invitation pib-btn pib-accept"
                        data-invitation-id="${inv.id_invitation}">Aceptar</button>
                <button class="btn-reject-invitation pib-btn pib-reject"
                        data-invitation-id="${inv.id_invitation}">Rechazar</button>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  _renderInviteModal() {
    return `
      <div id="inviteModalBackdrop" class="invite-modal-backdrop" style="display:none;">
        <div class="invite-modal" role="dialog" aria-modal="true">
          <div class="invite-modal-header">
            <h3 class="invite-modal-title">Invitar miembro</h3>
            <button id="inviteModalClose" class="invite-modal-close" aria-label="Cerrar">✕</button>
          </div>
          <div class="invite-modal-body">
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

  _openInviteModal() {
    const backdrop = document.getElementById("inviteModalBackdrop");
    if (backdrop) backdrop.style.display = "flex";
    document.getElementById("inviteSearchInput")?.focus();
  }

  _closeInviteModal() {
    const backdrop = document.getElementById("inviteModalBackdrop");
    if (backdrop) backdrop.style.display = "none";
  }

  _searchDebounceTimer = null;
  _searchCoders(query) {
    clearTimeout(this._searchDebounceTimer);
    this._searchDebounceTimer = setTimeout(() => this._fetchCoders(query), 400);
  }

  async _fetchCoders(query) {
    const listEl = document.getElementById("inviteCodersList");
    if (!listEl) return;

    listEl.innerHTML = `<p class="invite-hint">Buscando…</p>`;

    try {
      const teamId = this.team?.id_team;
      if (!teamId) return;

      const res = await getAvailableCoders(teamId, query);
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
            <span class="invite-coder-name">${c.name}</span>
            <span class="invite-coder-email">${c.email}</span>
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
      listEl.innerHTML = `<p class="invite-hint invite-error">${err?.message ?? "Error al buscar."}</p>`;
    }
  }

  async _sendInvite(btn) {
    const userId = btn.dataset.userId;
    const teamId = this.team?.id_team;
    if (!teamId || !userId) return;

    btn.disabled = true;
    btn.textContent = "Enviando…";

    try {
      await inviteMember(teamId, Number(userId));
      btn.textContent = "✓ Invitado";
      btn.classList.add("invite-status-pending");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Invitar";
      alert(err?.message ?? "No se pudo enviar la invitación.");
    }
  }
}
