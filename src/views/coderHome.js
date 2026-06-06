import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar";
import Header from "../components/header/header-config.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import {
  renderCoderTeam,
  loadProjectBrief,
  loadComments,
  loadMemberGrades,
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
  listAdditionalRepos,
  getAvailableCoders,
  inviteMember,
  acceptInvitation,
  rejectInvitation,
  leaveTeam,
  requestToJoinTeam,
  getTeamJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
} from "../services/api.js";
import {
  on as socketOn,
  off as socketOff,
  getSocket,
} from "../services/socket.js";

export default class CoderHome {
  constructor(router, { user, team } = {}) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.user = getUser();
    this.team = team || null;
    this.isLeader = false;

    // Selected event from event selection screen
    this.selectedEvent = router?.currentParams?.selectedEvent ?? null;
    if (!this.selectedEvent) {
      try {
        const stored = sessionStorage.getItem("selectedEvent");
        if (stored) this.selectedEvent = JSON.parse(stored);
      } catch (_) { }
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
      canCloseTeam: true,
      onTeamClosed: (team) => {
        this.team = { ...this.team, closed_at: team.closed_at };
        this.inviteModal.setTeam(this.team);
        this.render();
      },
      onTeamReopened: (team) => {
        this.team = { ...this.team, closed_at: team.closed_at ?? null };
        this.inviteModal.setTeam(this.team);
        this.render();
      },
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

      // Show toast for pending invitations
      if (this.pendingInvitations.length > 0 && !this.team) {
        const inv = this.pendingInvitations[0];
        toast.info(
            t("invite.pendingInvitation"),
            `${t("invite.pendingInvitation")} "${inv.team_name || t("teamsProjects.team")}"`,
            {
              duration: 0,
              dropdown: {
                items: [
                  {
                    title: inv.team_name || t("teamsProjects.team"),
                    subtitle: inv.event_name || t("common.event"),
                    accept: true,
                    deny: true,
                    id: inv.id_invitation,
                    teamId: inv.id_team,
                  },
                ],
                onAccept: async (item) => {
                  toast.remove();
                  await this.handleAcceptInvitation(item.id);
                },
                onDeny: async (item) => {
                  toast.remove();
                  await this.handleRejectInvitation(item.id);
                },
              },
            },
        );
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
          // Fetch full team details plus secondary repositories for deliverables.
          const [detail, reposRes] = await Promise.all([
            apiFetch(`/teams/${teamBasic.id_team}`, { method: "GET" }),
            listAdditionalRepos(teamBasic.id_team).catch(() => null),
          ]);
          const full = detail?.data ?? detail;
          const reposData = reposRes?.data ?? reposRes;

          this.team = {
            ...full,
            members: full.members ?? [],
            project: full.project ?? null,
            additionalRepos: reposData?.additional ?? [],
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
        } catch (_) { }
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

    // Socket: cuando llega una invitación nueva, actualizar estado y banner al instante
    socketOn("invitation:new", (data) => {
      const alreadyExists = this.pendingInvitations.some(
          (i) => i.id_invitation === data.id,
      );
      if (!alreadyExists) {
        this.pendingInvitations = [
          ...this.pendingInvitations,
          {
            id_invitation: data.id,
            id_team: data.teamId,
            team_name: data.teamName,
            event_name: data.eventName,
            invited_by_name: data.invitedByName,
          },
        ];
        this._updateInvitationsBanner();
        toast.info(
            t("invite.newInvitation"),
            `${data.invitedByName} invited you to join "${data.teamName}"`,
            { duration: 5000 },
        );
      }
    });

    // Socket: líder acepta/rechaza join request directo desde la notificación
    socketOn("join_request:new:accept", async (item) => {
      try {
        await acceptJoinRequest(item.id);
        toast.success(
            t("invite.accepted"),
            `${item.title} ${t("invite.joinedTeam")}`,
        );
        this.pendingJoinRequests = this.pendingJoinRequests.filter(
            (r) => String(r.id_request) !== String(item.id),
        );
        await this.init();
      } catch (err) {
        toast.error(t("common.error"), err?.message ?? t("common.error"));
      }
    });

    socketOn("join_request:new:deny", async (item) => {
      try {
        await rejectJoinRequest(item.id);
        toast.info(
            t("invite.declined"),
            `Request from ${item.title} ${t("invite.rejected")}`,
        );
        this.pendingJoinRequests = this.pendingJoinRequests.filter(
            (r) => String(r.id_request) !== String(item.id),
        );
      } catch (err) {
        toast.error(t("common.error"), err?.message ?? t("common.error"));
      }
    });

    // Socket: coder recibe confirmación de que su join request fue aceptada → recargar vista
    socketOn("join_request:accepted", async () => {
      await this.init();
    });

    // Socket: coder recibe confirmación de que su join request fue rechazada → limpiar estado
    socketOn("join_request:rejected", () => {
      this.pendingJoinRequests = [];
    });

    // Socket: líder recibe confirmación de que su invitación fue aceptada → recargar equipo
    socketOn("invitation:accepted", async () => {
      await this.init();
    });

    // Socket: líder recibe confirmación de que su invitación fue rechazada → solo actualizar invitaciones pendientes
    socketOn("invitation:rejected", async () => {
      const response = await apiFetch("/teams/my-teams", { method: "GET" });
      const data = response?.data ?? response;
      this.pendingInvitations = data?.pendingInvitations ?? [];
      this._updateInvitationsBanner();
    });
  }

  // ─────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────
  render() {
    console.log("esta es coder home");
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
            if (projectId && ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "ADMIN"].includes(this.user?.role)) loadMemberGrades(projectId, { members: this.team?.members ?? [] });
            if (projectId) initDeliverables(projectId, this);
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
      <div style="display:flex;flex-direction:column;width:100%">
        ${this.header.render()}
        <main class="coder-home-main">
          ${this.team ? "" : pendingBanner}
          ${content}
          ${this._renderInviteModal()}
        </main>
      </div>
    `;
    this.header.mountBreadcrumb();
    this.header.attachEventHandlers();

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

    this._offLangChange = onLangChange(() => this.render());
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────
  _mapTeams(rawTeams) {
    return (
        rawTeams
            // Safety net: never show teams whose project was already submitted,
            // even if the backend somehow returns them (e.g. stale cache, other endpoints).
            // The primary filter lives in teams.repository.js → findAll().
            .filter((t) => !t.submitted_at)
            .map((t) => {
              const memberCount = parseInt(t.member_count) || 0;
              const maxMembers =
                  t.max_team_size ?? this.selectedEvent?.max_team_size ?? 5;
              const isFull = memberCount >= maxMembers;
              const isPending =
                  !isFull &&
                  (this.pendingInvitations.some((inv) => inv.id_team === t.id_team) ||
                      this.pendingJoinRequests.some(
                          (req) => req.id_team === t.id_team,
                      ));
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
            })
    );
  }

  async _loadMoreTeams() {
    if (this._isFetchingMore) return;
    if (this._teamsPage >= this._teamsTotalPages) return;

    this._isFetchingMore = true;
    this._showLoadMoreSpinner(true);

    try {
      const nextPage = this._teamsPage + 1;
      const eventIdParam = this.selectedEvent?.id
          ? `&idEvent=${this.selectedEvent.id}`
          : "";
      const teamsRes = await apiFetch(
          `/teams?limit=10&page=${nextPage}${eventIdParam}`,
          {
            method: "GET",
          },
      );
      const teamsData = teamsRes?.data ?? teamsRes;
      const rawTeams = teamsData?.teams ?? [];
      this._teamsTotalPages =
          teamsData?.pagination?.totalPages ?? this._teamsTotalPages;
      this._teamsPage = nextPage;
      const newTeams = this._mapTeams(rawTeams);
      this.teams = [...this.teams, ...newTeams];
      this._appendTeamCards(newTeams);
    } catch (_) { }

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
    el.textContent = t("noTeam.allTeamsSeen");
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
              <p>${this.searchQuery || this.activeFilter !== "all" ? t("noTeam.noMatch") : t("noTeam.noTeams")}</p>
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
      countEl.textContent = `${this.getAvailableCount()} ${t("noTeam.available")}`;
    }
  }

  // ─────────────────────────────────────────
  // Called by the router when navigating away - cleans up all async resources
  destroy() {
    if (this._offLangChange) this._offLangChange();
    this._stopPolling();
    socketOff("invitation:new");
    socketOff("invitation:accepted");
    socketOff("invitation:rejected");
    socketOff("join_request:new:accept");
    socketOff("join_request:new:deny");
    socketOff("join_request:accepted");
    socketOff("join_request:rejected");
  }

  // Polling de invitaciones y join requests
  // ─────────────────────────────────────────
  _startPolling() {
    this._stopPolling();
    // Poll every 15s as fallback — socket handles real-time updates when connected
    this._pollingInterval = setInterval(() => this._checkUpdates(), 15000);
  }

  _stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
    this._destroyScrollObserver();
  }

  async _checkUpdates() {
    // Skip if socket is connected — it handles real-time updates
    const socket = getSocket();
    if (socket?.connected) return;

    try {
      // Coder sin equipo: chequear invitaciones nuevas Y si fue aceptado en un team
      console.log("POLLING CHECK RUNNING");
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
              t("invite.accepted"),
              `You are now part of team ${relevantTeam.name}`,
              {
                action: {
                  label: t("invite.viewTeam"),
                  onClick: async () => {
                    await this.init();
                    this.render();
                  },
                },
              },
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
          const currentIdSet = new Set(currentIds.split(",").filter(Boolean));
          const trulyNew = newInvitations.filter(
              (i) => !currentIdSet.has(String(i.id_invitation)),
          );
          this.pendingInvitations = newInvitations;
          // Banner now via Socket - no need to update
          trulyNew.forEach((inv) => {
            toast.info(
                t("invite.newInvitation"),
                `${t("common.someone")} invited you to join "${inv.team_name}"`,
                { duration: 5000 },
            );
          });
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
          // No toast here — socket already shows the accept/deny notification in real time
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

  _showInvitationsToast(invitations) {
    const count = invitations.length;
    const dropdownItems = invitations.map((inv) => ({
      id: inv.id_invitation,
      idTeam: inv.id_team,
      title: inv.team_name || "Unnamed Team",
      subtitle: `${inv.event_name || "No event"} • Invited by: ${inv.invited_by_name || t("common.someone")}`,
      accept: true,
      deny: true,
    }));

    toast.info(
        t("invite.pendingInvitations"),
        `You have ${count} unanswered invitation(s)`,
        {
          duration: 0,
          dropdown: {
            items: dropdownItems,
            onAccept: async (item) => {
              try {
                await acceptInvitation(item.id);
                toast.success(
                    t("invite.accepted"),
                    `You are now part of team "${item.title}"`,
                    {
                      duration: 5000,
                      action: {
                        label: t("invite.viewTeam"),
                        onClick: async () => {
                          await this.init();
                          this.render();
                        },
                        keepOpen: true,
                      },
                    },
                );
                this.pendingInvitations = this.pendingInvitations.filter(
                    (i) => i.id_invitation !== item.id,
                );
              } catch (err) {
                toast.error(
                    t("common.errorTitle"),
                    err?.message || t("common.error"),
                );
              }
            },
            onDeny: async (item) => {
              try {
                await rejectInvitation(item.id);
                toast.info(
                    t("invite.declined"),
                    `Invitation to "${item.title}" ${t("invite.rejected")}`,
                );
                this.pendingInvitations = this.pendingInvitations.filter(
                    (i) => i.id_invitation !== item.id,
                );
              } catch (err) {
                toast.error(
                    t("common.errorTitle"),
                    err?.message || t("common.error"),
                );
              }
            },
          },
        },
    );
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

    document.getElementById("reopenTeamBtn")?.addEventListener("click", () => {
      this._openInviteModal();
    });

    // ── Leave team button ──
    document
        .getElementById("leaveTeamBtn")
        ?.addEventListener("click", async () => {
          const confirmed = confirm(t("team.leaveConfirm"));
          if (!confirmed) return;

          try {
            await leaveTeam(this.team.id_team);
            this.team = null;
            this.isLeader = false;
            await this.init();
          } catch (err) {
            toast.error(
                t("common.errorTitle"),
                err?.message ?? t("common.error"),
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
      this.createTeamError = t("noTeam.teamName");
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
      toast.success(
          t("noTeam.teamCreated"),
          `Team "${payload?.name ?? teamName}" created successfully.`,
      );
      this.formData = { teamName: "", projectTopic: "" };
      this.isCreatingTeam = false;

      // Hacer init completo para obtener miembros, avatar, isLeader, etc.
      await this.init();
    } catch (error) {
      this.createTeamError =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          t("common.error");
      toast.error(t("common.error"), this.createTeamError);
      this.createTeamSuccess = "";
      this.isCreatingTeam = false;
      this.render();
    }
  }

  handleJoinTeam(teamId) {
    const btn = document.querySelector(`.btn-join[data-team-id="${teamId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = t("team.sending");
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
          this._showJoinFeedback(t("noTeam.requestSent"), "success");
        })
        .catch((err) => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = t("noTeam.joinBtn");
          }
          this._showJoinFeedback(err?.message ?? t("common.error"), "error");
        });
  }

  _showJoinFeedback(message, type) {
    if (type === "success") {
      toast.success(t("noTeam.requestSent"), message);
    } else {
      toast.error(t("common.error"), message);
    }
  }

  // ─────────────────────────────────────────
  // Pending invitations
  // ─────────────────────────────────────────
  async handleAcceptInvitation(invitationId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = t("team.sending");
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
        btn.textContent = t("invite.accept");
      }
      if (rejectBtn) rejectBtn.disabled = false;
      toast.error(t("common.error"), err?.message ?? t("common.error"));
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
      toast.error(t("common.error"), err?.message ?? t("common.error"));
    }
  }

  async handleCancelJoinRequest(requestId, btn) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = t("team.sending");
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
        btn.textContent = t("common.cancel");
      }
      this._showJoinFeedback(err?.message ?? t("common.error"), "error");
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
                        data-invitation-id="${inv.id_invitation}">${t("invite.accept")}</button>
                <button class="btn-reject-invitation pib-btn pib-reject"
                        data-invitation-id="${inv.id_invitation}">${t("invite.reject")}</button>
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
                        data-request-id="${req.id_request}">${t("invite.cancel")}</button>
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
