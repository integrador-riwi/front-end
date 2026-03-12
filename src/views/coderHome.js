import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar";
import { toast } from "../components/Toast/index.js";
import {
  renderCoderTeam,
  loadProjectBrief,
  loadComments,
  loadEvaluationPanel,
  initDeliverables,
} from "./coderTeam.js";
import {
  renderCoderNoTeam,
  setupAIAnalysis,
  renderTeamCard,
  renderSkeletonCards,
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

    // Selected event from event selection screen
    this.selectedEvent = router?.currentParams?.selectedEvent ?? null;
    if (!this.selectedEvent) {
      try {
        const stored = sessionStorage.getItem("selectedEvent");
        if (stored) this.selectedEvent = JSON.parse(stored);
      } catch (_) {}
    }

    this.searchQuery = "";
    this.activeFilter = "all";
    this.isLoadingTeams = false;
    this._teamsPage = 1;
    this._teamsTotalPages = 1;
    this._isFetchingMore = false;
    this._scrollObserver = null;

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

    this.teams = [];
  }

  // ─────────────────────────────────────────
  // Init — load team from API before rendering
  // ─────────────────────────────────────────
  async init() {
    try {
      this.team = null;
      this.isLeader = false;
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
        // Find team that belongs to selected event directly from the list
        // (getMyTeams now returns id_event — no extra per-team requests needed)
        let teamBasic = null;

        if (this.selectedEvent?.id) {
          teamBasic =
            teams.find((t) => t.id_event === this.selectedEvent.id) ?? null;
        }
        // No fallback — if no team matches the selected event, show the no-team view

        if (teamBasic) {
          // Fetch full team details (members, project) in a single request
          const detail = await apiFetch(`/teams/${teamBasic.id_team}`, {
            method: "GET",
          });
          const full = detail?.data ?? detail;

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
          // NOTE: Do NOT remove selectedEvent here — removing it causes init() to
          // lose the event context on every re-render/poll cycle, making teamForEvent
          // come back null and triggering an infinite no-team / team flicker.
        }
        // If no team found for selected event, leave this.team as null (no-team view)
      }

      // Load real available teams for the no-team view
      if (!this.team) {
        this.isLoadingTeams = true;
        this._teamsPage = 1;
        this._teamsTotalPages = 1;
        this.teams = [];
        this.render(); // show skeletons immediately
        try {
          const eventIdParam = this.selectedEvent?.id
            ? `&idEvent=${this.selectedEvent.id}`
            : "";
          const teamsRes = await apiFetch(
            `/teams?limit=10&page=1${eventIdParam}`,
            {
              method: "GET",
            },
          );
          const teamsData = teamsRes?.data ?? teamsRes;
          const rawTeams = teamsData?.teams ?? [];
          this._teamsTotalPages = teamsData?.pagination?.totalPages ?? 1;
          this.teams = this._mapTeams(rawTeams);
        } catch (_) {}
        this.isLoadingTeams = false;
      }
    } catch (e) {
      this.team = null;
    }
    this.render();

    // Attach infinite scroll sentinel for no-team view
    if (!this.team && this._teamsPage < this._teamsTotalPages) {
      const listEl = document.querySelector(".team-list");
      if (listEl) this._attachScrollSentinel(listEl);
    }

    // Polling: sin equipo (espera invitaciones) o líder (espera join requests)
    if (!this.team || this.isLeader) {
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
            selectedEvent: this.selectedEvent ?? null,
            isTL: [
              "TL_DEVELOPMENT",
              "TL_SOFT_SKILLS",
              "TL_ENGLISH",
              "ADMIN",
            ].includes(this.user?.role),
          });
          const projectId = this.team?.project?.id_project;
          const eventId = this.team?.id_event ?? this.selectedEvent?.id ?? null;
          setTimeout(() => {
            loadProjectBrief();
            if (projectId) loadComments(projectId, this.user);
            if (projectId) initDeliverables(projectId);
            if (
              projectId &&
              eventId &&
              [
                "TL_DEVELOPMENT",
                "TL_SOFT_SKILLS",
                "TL_ENGLISH",
                "ADMIN",
              ].includes(this.user?.role)
            ) {
              loadEvaluationPanel({
                projectId,
                eventId,
                members: this.team?.members ?? [],
              });
            }
          }, 0);
          return html;
        })()
      : renderCoderNoTeam({
          user: this.user,
          teams: this.getFilteredTeams(),
          searchQuery: this.searchQuery,
          activeFilter: this.activeFilter,
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
          isLoading: this.isLoadingTeams,
          selectedEvent: this.selectedEvent ?? null,
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

    // Event badge back navigation
    const eventBadge = document.getElementById("eventBadgeBack");
    if (eventBadge) {
      eventBadge.addEventListener("click", () => {
        this.router.navigate("coderEventSelect");
      });
    }

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
  _mapTeams(rawTeams) {
    return rawTeams.map((t) => {
      const memberCount = parseInt(t.member_count) || 0;
      const maxMembers =
        t.max_team_size ?? this.selectedEvent?.max_team_size ?? 5;
      const isFull = memberCount >= maxMembers;
      const isPending =
        !isFull &&
        (this.pendingInvitations.some((inv) => inv.id_team === t.id_team) ||
          this.pendingJoinRequests.some((req) => req.id_team === t.id_team));
      return {
        id: t.id_team,
        name: t.name,
        description: t.description ?? null,
        leaderName: t.leader_name ?? null,
        leaderEmail: t.leader_email ?? null,
        leaderId: t.leader_id ?? null,
        leaderAvatarUrl: t.leader_avatar_url ?? null,
        members: t.members ?? [],
        memberCount,
        maxMembers,
        slotsLeft: Math.max(0, maxMembers - memberCount),
        status: isFull ? "full" : isPending ? "pending" : "open",
        createdAt: t.created_at ?? null,
      };
    });
  }

  async _loadMoreTeams() {
    if (this._isFetchingMore) return;
    if (this._teamsPage >= this._teamsTotalPages) return;

    this._isFetchingMore = true;
    this._showLoadMoreSpinner(true);

    try {
      const nextPage = this._teamsPage + 1;
      const teamsRes = await apiFetch(`/teams?limit=10&page=${nextPage}`, {
        method: "GET",
      });
      const teamsData = teamsRes?.data ?? teamsRes;
      const rawTeams = teamsData?.teams ?? [];
      this._teamsTotalPages =
        teamsData?.pagination?.totalPages ?? this._teamsTotalPages;
      this._teamsPage = nextPage;
      const newTeams = this._mapTeams(rawTeams);
      this.teams = [...this.teams, ...newTeams];
      this._appendTeamCards(newTeams);
    } catch (_) {}

    this._isFetchingMore = false;
    this._showLoadMoreSpinner(false);

    // Re-attach if still more pages
    if (this._teamsPage >= this._teamsTotalPages) {
      this._destroyScrollObserver();
      this._showEndOfList();
    }
  }

  _appendTeamCards(newTeams) {
    const listEl = document.querySelector(".team-list");
    if (!listEl) return;
    // Remove sentinel temporarily
    const sentinel = listEl.querySelector(".scroll-sentinel");
    if (sentinel) sentinel.remove();

    newTeams.forEach((team) => {
      const div = document.createElement("div");
      div.innerHTML = renderTeamCard(team);
      const card = div.firstElementChild;
      listEl.appendChild(card);
      card
        .querySelector(".btn-join")
        ?.addEventListener("click", () =>
          this.handleJoinTeam(card.querySelector(".btn-join").dataset.teamId),
        );
    });

    // Re-add sentinel if still more pages
    if (this._teamsPage < this._teamsTotalPages) {
      this._attachScrollSentinel(listEl);
    }
  }

  _attachScrollSentinel(listEl) {
    const sentinel = document.createElement("div");
    sentinel.className = "scroll-sentinel";
    listEl.appendChild(sentinel);

    this._destroyScrollObserver();
    this._scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) this._loadMoreTeams();
      },
      { root: listEl.closest(".join-team-section"), threshold: 0.1 },
    );
    this._scrollObserver.observe(sentinel);
  }

  _destroyScrollObserver() {
    if (this._scrollObserver) {
      this._scrollObserver.disconnect();
      this._scrollObserver = null;
    }
  }

  _showLoadMoreSpinner(show) {
    const listEl = document.querySelector(".team-list");
    if (!listEl) return;
    let spinner = listEl.querySelector(".load-more-spinner");
    if (show && !spinner) {
      spinner = document.createElement("div");
      spinner.className = "load-more-spinner";
      spinner.innerHTML = `<span class="ai-spinner"></span> Loading more...`;
      listEl.appendChild(spinner);
    } else if (!show && spinner) {
      spinner.remove();
    }
  }

  _showEndOfList() {
    const listEl = document.querySelector(".team-list");
    if (!listEl || listEl.querySelector(".end-of-list")) return;
    const el = document.createElement("div");
    el.className = "end-of-list";
    el.textContent = "You've seen all teams";
    listEl.appendChild(el);
  }

  getFilteredTeams() {
    let results = this.teams;

    // Status filter
    if (this.activeFilter && this.activeFilter !== "all") {
      results = results.filter((t) => t.status === this.activeFilter);
    }

    // Text search (safe null check on description)
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.leaderName ?? "").toLowerCase().includes(q),
      );
    }

    return results;
  }

  getAvailableCount() {
    return this.teams.filter((t) => t.status === "open").length;
  }

  // Updates only the team list and counter without re-rendering the whole page (preserves input focus)
  _updateTeamList() {
    const listEl = document.querySelector(".team-list");
    const countEl = document.querySelector(".available-count");
    this._destroyScrollObserver();

    if (listEl) {
      const filtered = this.getFilteredTeams();
      listEl.innerHTML = this.isLoadingTeams
        ? renderSkeletonCards(4)
        : filtered.length === 0
          ? `<div class="teams-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <p>${this.searchQuery || this.activeFilter !== "all" ? "No teams match your filters." : "No teams available right now."}</p>
            </div>`
          : filtered.map((team) => renderTeamCard(team)).join("");

      listEl.querySelectorAll(".btn-join").forEach((btn) => {
        btn.addEventListener("click", () =>
          this.handleJoinTeam(btn.dataset.teamId),
        );
      });

      // Only attach sentinel when showing unfiltered list and there are more pages
      const isFiltering =
        this.searchQuery.trim() || this.activeFilter !== "all";
      if (
        !isFiltering &&
        this._teamsPage < this._teamsTotalPages &&
        filtered.length > 0
      ) {
        this._attachScrollSentinel(listEl);
      } else if (
        !isFiltering &&
        this._teamsPage >= this._teamsTotalPages &&
        filtered.length > 0
      ) {
        this._showEndOfList();
      }
    }
    if (countEl) {
      countEl.textContent = `${this.getAvailableCount()} Available`;
    }
  }

  // ─────────────────────────────────────────
  // Called by the router when navigating away - cleans up all async resources
  destroy() {
    this._stopPolling();
  }

  // Polling de invitaciones y join requests
  // ─────────────────────────────────────────
  _startPolling() {
    this._stopPolling();
    this._pollingInterval = setInterval(() => this._checkUpdates(), 5000);
  }

  _stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
    this._destroyScrollObserver();
  }

  async _checkUpdates() {
    try {
      // Coder sin equipo: chequear invitaciones nuevas Y si fue aceptado en un team
      if (!this.team) {
        const response = await apiFetch("/teams/my-teams", { method: "GET" });
        const data = response?.data ?? response;

        // Si ahora tiene equipo → fue aceptada su join request o invitación
        const teams = data?.teams ?? [];
        // Only trigger reload if the new team belongs to the selected event
        const relevantTeam = this.selectedEvent?.id
          ? teams.find((t) => t.id_event === this.selectedEvent.id)
          : teams[0];
        if (relevantTeam) {
          this._stopPolling();
          toast.success(
            '¡Has sido aceptado!',
            `Ahora eres parte del equipo ${relevantTeam.name}`,
            {
              action: {
                label: 'Ver equipo',
                onClick: async () => {
                  await this.init();
                  this.render();
                }
              }
            }
          );
          return;
        }

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
          if (newInvitations.length > currentIds.split(',').filter(Boolean).length) {
            toast.info('Nueva invitación', `Has recibido ${newInvitations.length} nueva(s) invitación(es) a un equipo`);
          }
        }
        return;
      }

      // Líder con equipo: chequear join requests nuevos
      if (this.isLeader && this.team?.id_team) {
        const res = await apiFetch(
          `/teams/${this.team.id_team}/join-requests`,
          { method: "GET" },
        );
        const newRequests = res?.data ?? res ?? [];
        const currentIds = this.pendingJoinRequests
          .map((r) => r.id_request)
          .sort()
          .join(",");
        const newIds = newRequests
          .map((r) => r.id_request)
          .sort()
          .join(",");
        if (currentIds !== newIds) {
          this.pendingJoinRequests = newRequests;
          const prevCount = currentIds.split(',').filter(Boolean).length;
          if (newRequests.length > prevCount) {
            toast.info('Nueva solicitud', `Tienes ${newRequests.length} solicitud(es) de unión pendientes`);
          }
          this.inviteModal?.refreshJoinRequests?.();
        }
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

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeFilter = btn.dataset.filter;
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this._updateTeamList();
      });
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
        const confirmed = confirm("Are you sure you want to leave the team?");
        if (!confirmed) return;

        try {
          await leaveTeam(this.team.id_team);
          this.team = null;
          this.isLeader = false;
          await this.init();
        } catch (err) {
          alert("Error leaving the team: " + (err?.message ?? "Try again"));
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
      this.createTeamError = "Team name is required.";
      this.createTeamSuccess = "";
      this.render();
      return;
    }

    this.isCreatingTeam = true;
    this.createTeamError = "";
    this.createTeamSuccess = "";
    this.render();

    try {
      const idEventValue = this.selectedEvent?.id ?? null;
      console.log("[createTeam] Enviando idEvent:", idEventValue);
      const response = await createTeamRequest({
        name: teamName,
        description: projectTopic,
        idEvent: idEventValue,
      });
      console.log("[createTeam] Response:", response);
      const payload = response?.data ?? response;
      this.createTeamSuccess = `Team "${payload?.name ?? teamName}" created successfully.`;
      this.formData = { teamName: "", projectTopic: "" };
      this.isCreatingTeam = false;

      // Hacer init completo para obtener miembros, avatar, isLeader, etc.
      await this.init();
    } catch (error) {
      this.createTeamError =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Could not create the team.";
      this.createTeamSuccess = "";
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
          "✓ Request sent. The team leader will review it.",
          "success",
        );
      })
      .catch((err) => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Request to Join";
        }
        this._showJoinFeedback(
          err?.message ?? "Could not send the request.",
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
      btn.textContent = "Accepting…";
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
        btn.textContent = "Accept";
      }
      if (rejectBtn) rejectBtn.disabled = false;
      alert(err?.message ?? "Could not accept the invitation.");
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
      alert(err?.message ?? "Could not reject the invitation.");
    }
  }

  async handleCancelJoinRequest(requestId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Canceling…";
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
        btn.textContent = "Cancel";
      }
      this._showJoinFeedback(
        err?.message ?? "Could not cancel the request.",
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
        <p class="pib-title">📬 You have ${this.pendingInvitations.length} pending invitation(s)</p>
        <div class="pib-list">
          ${this.pendingInvitations
            .map(
              (inv) => `
            <div class="pib-item">
              <span>Team: <strong>${inv.team_name ?? inv.id_team}</strong></span>
              <div class="pib-actions">
                <button class="btn-accept-invitation pib-btn pib-accept"
                        data-invitation-id="${inv.id_invitation}">Accept</button>
                <button class="btn-reject-invitation pib-btn pib-reject"
                        data-invitation-id="${inv.id_invitation}">Reject</button>
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
        <p class="pib-title">📤 You have ${this.pendingJoinRequests.length} pending join request(s)</p>
        <div class="pib-list">
          ${this.pendingJoinRequests
            .map(
              (req) => `
            <div class="pib-item">
              <span>Team: <strong>${req.team_name ?? req.id_team}</strong></span>
              <div class="pib-actions">
                <button class="btn-cancel-join-request pib-btn pib-reject"
                        data-request-id="${req.id_request}">Cancel</button>
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
