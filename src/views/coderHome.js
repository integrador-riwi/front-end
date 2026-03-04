import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar";
import { renderCoderTeam, loadProjectBrief } from "./coderTeam.js";
import {
  renderCoderNoTeam,
  setupAIAnalysis,
  renderTeamCard,
} from "./coderNoTeam.js";
import { getUser } from "../utils/auth";
import InviteModal from "../components/inviteModal/InviteModal.js";
import {
  createTeam as createTeamRequest,
  apiFetch,
  getAvailableCoders,
  inviteMember,
  acceptInvitation,
  rejectInvitation,
  leaveTeam,
  requestToJoinTeam,
  getMyJoinRequests,
  getTeamJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
} from "../services/api.js";

export default class CoderHome {
  constructor(router, { user, team } = {}) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.user = getUser();
    this.team = team || null;
    this.isLeader = false;

    this.searchQuery = "";

    this.aiResult = null;
    this.isAnalyzing = false;
    this.isCreatingTeam = false;
    this.createTeamError = "";
    this.createTeamSuccess = "";
    this.pendingInvitations = [];
    this.pendingJoinRequests = [];
    this._pollingInterval = null;

    this.inviteModal = new InviteModal({
      team: this.team,
      onMemberAdded: () => this.init().then(() => this.render()),
    });

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
      this.pendingJoinRequests = data?.pendingJoinRequests ?? [];

      // Also fetch join requests if not in my-teams response
      if (this.pendingJoinRequests.length === 0 && !this.team) {
        try {
          const joinRequestsRes = await getMyJoinRequests();
          this.pendingJoinRequests =
            joinRequestsRes?.data ?? joinRequestsRes ?? [];
        } catch (e) {
          console.error("Error fetching join requests:", e);
        }
      }

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
        const currentUserId = this.user?.id_user;
        this.isLeader = (full.members ?? []).some(
          (m) => m.id_user === currentUserId && m.team_role === "LEADER",
        );
        this.inviteModal.setTeam(this.team);
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
                    ) ||
                    this.pendingJoinRequests.some(
                      (req) => req.id_team === t.id_team,
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
          const html = renderCoderTeam({
            user: this.user,
            team: this.team,
            isLeader: this.isLeader,
          });
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
      !this.team &&
      (this.pendingInvitations.length > 0 ||
        this.pendingJoinRequests.length > 0)
        ? this._renderPendingInvitationsBanner() +
          this._renderPendingJoinRequestsBanner()
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

    // Mount shared invite modal into the DOM (once per render cycle)
    if (!document.getElementById("inviteModalBackdrop")) {
      document.getElementById("app")?.appendChild(this.inviteModal.element());
    }

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

  // Updates only the team list and counter without re-rendering the whole page (preserves input focus)
  _updateTeamList() {
    const listEl = document.querySelector(".team-list");
    const countEl = document.querySelector(".available-count");
    if (listEl) {
      const filtered = this.getFilteredTeams();
      const noTeamsMsg = this.searchQuery.trim()
        ? `No teams found matching "${this.searchQuery}"`
        : "No teams available.";
      listEl.innerHTML =
        filtered.length === 0
          ? `<p style="text-align:center;color:#9ca3b8;padding:2rem;">${noTeamsMsg}</p>`
          : filtered.map((team) => renderTeamCard(team)).join("");
      listEl.querySelectorAll(".btn-join").forEach((btn) => {
        btn.addEventListener("click", () =>
          this.handleJoinTeam(btn.dataset.teamId),
        );
      });
    }
    if (countEl) {
      countEl.textContent = `${this.getAvailableCount()} Available`;
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
      this._updateTeamList();
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

    // ── Cancel join request handlers ──
    document.querySelectorAll(".btn-cancel-join-request").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.handleCancelJoinRequest(btn.dataset.requestId, btn),
      );
    });

    // ── Team view handlers ──
    const btnProjectSettings = document.querySelector(".btn-project-settings");
    if (btnProjectSettings) {
      btnProjectSettings.addEventListener("click", (e) => {
        if (!this.isLeader) return;
        const route = e.currentTarget.dataset.route;
        if (route) {
          this.router.navigate(route, {
            team: this.team,
            isLeader: this.isLeader,
          });
        }
      });
    }

    // ── Add member button → open modal (leader only) ──
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
    const btn = document.querySelector(`.btn-join[data-team-id="${teamId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Sending...";
    }

    requestToJoinTeam(teamId)
      .then((res) => {
        // Update local state so the card shows pending immediately
        this.pendingJoinRequests = [
          ...this.pendingJoinRequests,
          {
            id_request: res?.data?.id_request ?? res?.id_request,
            id_team: Number(teamId),
            team_name:
              this.teams.find((t) => t.id === Number(teamId))?.name ?? "",
          },
        ];
        this._updateTeamList();
        this._showJoinFeedback(
          "✓ Solicitud enviada. El líder del equipo la revisará.",
          "success",
        );
      })
      .catch((err) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Request to Join";
        }
        this._showJoinFeedback(
          err?.message ?? "No se pudo enviar la solicitud.",
          "error",
        );
      });
  }

  _showJoinFeedback(message, type) {
    const existing = document.getElementById("join-feedback-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "join-feedback-banner";
    banner.style.cssText = `
      padding: 0.85rem 1.25rem; border-radius: 10px; margin-bottom: 1rem;
      font-size: 0.9rem; font-weight: 500;
      background: ${type === "success" ? "#f0fdf4" : "#fef2f2"};
      border: 1px solid ${type === "success" ? "#86efac" : "#fca5a5"};
      color: ${type === "success" ? "#16a34a" : "#dc2626"};
    `;
    banner.textContent = message;

    const container = document.querySelector(".team-selection-container");
    if (container) container.insertBefore(banner, container.firstChild);

    setTimeout(() => banner.remove(), 4000);
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

  async handleCancelJoinRequest(requestId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Cancelando…";
    }
    try {
      await cancelJoinRequest(requestId);
      this.pendingJoinRequests = this.pendingJoinRequests.filter(
        (r) => String(r.id_request) !== String(requestId),
      );
      this.render();
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Cancelar";
      }
      this._showJoinFeedback(
        err?.message ?? "No se pudo cancelar la solicitud.",
        "error",
      );
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

  _renderPendingJoinRequestsBanner() {
    if (this.pendingJoinRequests.length === 0) return "";
    return `
      <div class="pending-invitations-banner" style="background: #fef3c7; border-color: #f59e0b;">
        <p class="pib-title">📤 Tienes ${this.pendingJoinRequests.length} solicitud(es) de unión pendiente(s)</p>
        <div class="pib-list">
          ${this.pendingJoinRequests
            .map(
              (req) => `
            <div class="pib-item">
              <span>Equipo: <strong>${req.team_name ?? req.id_team}</strong></span>
              <div class="pib-actions">
                <button class="btn-cancel-join-request pib-btn pib-reject"
                        data-request-id="${req.id_request}">Cancelar</button>
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
    return "";
  } // modal is now mounted separately via InviteModal component

  _openInviteModal() {
    this.inviteModal.setTeam(this.team);
    this.inviteModal.open();
  }

  _closeInviteModal() {
    this.inviteModal.close();
  }
}
