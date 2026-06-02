import Navbar from "../components/navbar/navbar.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/projectSettings.css";
import InviteModal from "../components/inviteModal/InviteModal.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import {
  apiFetch,
  updateTeam,
  updateProject,
  inviteMember,
  removeMember,
  getAvailableCoders,
  listAdditionalRepos,
  createAdditionalRepo,
  deleteAdditionalRepo,
} from "../services/api.js";

export default class ProjectSettings {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.team = params.team || null;
    this.isLeader = params.isLeader ?? false;
    this.project = null;
    this.isSaving = false;
    this.additionalRepos = [];
    this.inviteModal = new InviteModal({
      team: this.team,
      onMemberAdded: () => this._loadData().then(() => this._renderFull()),
    });
  }

  async render() {
    const app = document.getElementById("app");

    // Guard: only leaders can access this page
    if (!this.isLeader) {
      this.router.navigate("coderHome");
      return;
    }

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="cs-main">
        <div class="container-xl px-3 px-md-4 py-4">
          <nav class="cs-breadcrumb d-flex align-items-center gap-2 mb-3">
            <span class="cs-bc-link" data-route="coderHome">${t("common.home")}</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-current">${t("settings.title")}</span>
          </nav>
          <div class="d-flex align-items-center justify-content-center" style="min-height: 300px;">
            <div class="cs-spinner"></div>
          </div>
        </div>
      </main>
    `;

    this.navbar.attachEventHandlers();
    document
      .querySelector(".cs-bc-link[data-route]")
      ?.addEventListener("click", (e) => {
        this.router.navigate(e.target.dataset.route);
      });

    await this._loadData();
    this._renderFull();
  }

  async _loadData() {
    try {
      if (!this.team) {
        const res = await apiFetch("/teams/my-teams", { method: "GET" });
        const data = res?.data ?? res;
        const teams = data?.teams ?? [];
        if (teams.length === 0) {
          this.router.navigate("coderHome");
          return;
        }
        const detail = await apiFetch(`/teams/${teams[0].id_team}`, {
          method: "GET",
        });
        this.team = detail?.data ?? detail;
      } else {
        const detail = await apiFetch(`/teams/${this.team.id_team}`, {
          method: "GET",
        });
        this.team = detail?.data ?? detail;
      }

      if (this.team?.project?.id_project) {
        const proj = await apiFetch(
          `/projects/${this.team.project.id_project}`,
          { method: "GET" },
        );
        this.project = proj?.data ?? proj;
      } else {
        this.project = this.team?.project ?? null;
      }

      try {
        const reposRes = await listAdditionalRepos(this.team.id_team);
        this.additionalRepos = reposRes?.data ?? reposRes ?? [];
      } catch {
        this.additionalRepos = [];
      }
    } catch (e) {
      console.error("Error loading settings data:", e);
    }
  }

  _renderFull() {
    const app = document.getElementById("app");
    const teamName = this.team?.name ?? "";
    const projectName = this.project?.name ?? this.team?.project?.name ?? "";
    const projectDesc =
      this.project?.description ?? this.team?.project?.description ?? "";
    const repoUrl =
      this.project?.repo_url ?? this.team?.project?.repo_url ?? "";
    const members = this.team?.members ?? [];

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="cs-main">
        <div class="container-xl px-3 px-md-4 py-4">

          <nav class="cs-breadcrumb d-flex align-items-center gap-2 mb-3">
            <span class="cs-bc-link" data-route="coderHome">${t("common.home")}</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-link">${escHtml(projectName || teamName)}</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-current">${t("settings.title")}</span>
          </nav>

          <h1 class="cs-page-title mb-1">${t("settings.title")}</h1>
          <p class="cs-page-sub mb-4">${t("settings.manageMembers")}</p>

          <div id="cs-feedback" class="mb-3" style="display:none;"></div>

          <div class="row g-4 align-items-start">

            <!-- ══ LEFT ══ -->
            <div class="col-12 col-lg-8 d-flex flex-column gap-4">

              <!-- General Information -->
              <div class="bg-white rounded-4 p-4 cs-card">
                <h2 class="cs-card-title d-flex align-items-center gap-2 mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       style="width:18px;height:18px;color:var(--accent)">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  ${t("settings.generalInfo")}
                </h2>
                <div class="d-flex flex-column gap-3">
                  <div>
                    <label class="cs-label">${t("settings.name")}</label>
                    <input type="text" class="cs-input" id="settingProjectName"
                           value="${escHtml(projectName)}" placeholder="${t("settings.namePlaceholder") ?? "Enter project name"}"
                           readonly style="opacity:0.6;cursor:not-allowed;background:var(--color-bg,#f3f4f8);" />
                    <p class="cs-hint mt-1">${t("settings.nameHint")}</p>
                  </div>
                  <div>
                    <label class="cs-label">${t("settings.desc")}</label>
                    <textarea class="cs-input cs-textarea" id="settingProjectDesc"
                              placeholder="${t("settings.placeholderDesc")}">${escHtml(projectDesc)}</textarea>
                  </div>
                  <div>
                    <label class="cs-label">${t("settings.repo")}</label>
                    <div class="cs-input-icon-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                           class="cs-input-icon">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                      </svg>
                      <input type="url" class="cs-input cs-input-with-icon" id="settingRepoUrl"
                             value="${escHtml(repoUrl)}" placeholder="${t("settings.placeholderRepo")}"
                             ${repoUrl ? "readonly title='The repository is assigned automatically when the project is created'" : ""} />
                    </div>
                    ${repoUrl ? `<p class="cs-hint mt-1">${t("settings.repoAutoAssigned")}</p>` : ""}
                  </div>
                  <div class="d-flex justify-content-end">
                    <button class="cs-btn-primary" id="saveSettingsBtn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                           style="width:15px;height:15px">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      ${t("settings.saveChanges")}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Danger Zone -->
              <div class="cs-danger-card rounded-4 p-4">
                <h2 class="cs-danger-title mb-1">${t("settings.dangerZone")}</h2>
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <p class="cs-danger-sub mb-0">${t("settings.deleteHint")}</p>
                  <button class="cs-btn-danger" id="deleteProjectBtn">${t("settings.deleteTeam")}</button>
                </div>
              </div>

            </div>

            <!-- ══ RIGHT ══ -->
            <div class="col-12 col-lg-4">
              <div class="bg-white rounded-4 p-4 cs-card">
                <h2 class="cs-card-title d-flex align-items-center gap-2 mb-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       style="width:18px;height:18px;color:var(--accent)">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  ${t("settings.teamManagement")}
                </h2>
                <p class="cs-card-sub mb-4">${t("settings.manageMembers")}</p>

                <!-- Invite button -->
                <button class="cs-btn-primary w-100 mb-4 d-flex align-items-center justify-content-center gap-2"
                        id="openInviteModalBtn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                       style="width:15px;height:15px">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  ${t("settings.inviteMember")}
                </button>

                <!-- Members -->
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="cs-label mb-0">${t("settings.members")}</span>
                  <span class="cs-count-badge">${members.length}</span>
                </div>
                <ul class="list-unstyled d-flex flex-column gap-3 mb-4" id="membersList">
                  ${members.map((m, i) => this.renderMember(m, i)).join("")}
                </ul>

                <button class="cs-btn-copy w-100 d-flex align-items-center justify-content-center gap-2"
                        id="copyInviteLinkBtn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       style="width:15px;height:15px">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  ${t("settings.copyInviteLink")}
                </button>

              </div>
            </div>

          </div>
        </div>
      </main>
    `;

    this.navbar.attachEventHandlers();
    this.attachEventHandlers();

    // Mount shared invite modal
    this.inviteModal.setTeam(this.team);
    if (!document.getElementById("inviteModalBackdrop")) {
      document.getElementById("app")?.appendChild(this.inviteModal.element());
    }
    if (!this._offLangChange) {
      this._offLangChange = onLangChange(() => this._renderFull());
    }
  }

  renderMember(m, i) {
    const isLead = m.team_role === "LEADER";
    const isMe = m.id_user === this.user?.id_user;
    return `
      <li class="d-flex align-items-center gap-3" data-member-id="${m.id_user}">
        <div class="cs-avatar cs-avatar-color-${i % 4}">${m.name.charAt(0)}</div>
        <div class="flex-grow-1 overflow-hidden">
          <p class="cs-member-name text-truncate mb-0">
            ${escHtml(m.name)}
            ${isMe ? `<span class="cs-you-tag">${t("team.you")}</span>` : ""}
          </p>
          <p class="cs-member-role mb-0">${isLead ? t("team.lead") : t("team.member")}</p>
        </div>
        ${
          isLead
            ? `<span class="cs-lead-badge">${t("team.lead").toUpperCase()}</span>`
            : `<button class="cs-btn-remove" data-member-id="${m.id_user}" data-member-name="${escHtml(m.name)}" title="${t("settings.remove")}">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
               </svg>
             </button>`
        }
      </li>
    `;
  }

  attachEventHandlers() {
    document
      .querySelector(".cs-bc-link[data-route]")
      ?.addEventListener("click", (e) => {
        this.router.navigate(e.target.dataset.route);
      });

    document
      .getElementById("saveSettingsBtn")
      ?.addEventListener("click", () => this.handleSave());
    document
      .getElementById("deleteProjectBtn")
      ?.addEventListener("click", () => this.handleDelete());
    document
      .getElementById("copyInviteLinkBtn")
      ?.addEventListener("click", () => this.handleCopyLink());

    document.querySelectorAll(".cs-btn-remove").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.handleRemoveMember(btn.dataset.memberId, btn.dataset.memberName),
      );
    });

    // Open invite modal
    document
      .getElementById("openInviteModalBtn")
      ?.addEventListener("click", () => {
        this.inviteModal.open();
      });
  }

  // ─────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────
  async handleSave() {
    const btn = document.getElementById("saveSettingsBtn");
    const description = document
      .getElementById("settingProjectDesc")
      ?.value.trim();

    if (btn) {
      btn.disabled = true;
      btn.textContent = t("common.loading");
    }

    try {
      const projectId =
        this.project?.id_project ?? this.team?.project?.id_project;
      if (projectId) {
        await updateProject(projectId, { description });
      } else {
        await updateTeam(this.team.id_team, {});
      }
      this._showFeedback(
        t("settings.savedOk") ?? "Changes saved successfully.",
        "success",
      );
    } catch (err) {
      this._showFeedback(err?.message ?? t("common.error"), "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg> Save Changes`;
      }
    }
  }

  async handleDelete() {
    const confirmed = confirm(
      t("settings.deleteConfirm") ??
        "Are you sure? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      // Backend only allows ADMIN to delete via DELETE /teams/:id
      // Leader leaves team which triggers auto-delete when alone, or use leave endpoint
      const { leaveTeam } = await import("../services/api.js");
      await leaveTeam(this.team.id_team);
      this.router.navigate("coderHome");
    } catch (err) {
      this._showFeedback(err?.message ?? t("common.error"), "error");
    }
  }

  async handleRemoveMember(memberId, memberName) {
    const confirmed = confirm(
      t("settings.removeMemberConfirm", { name: memberName }),
    );
    if (!confirmed) return;

    try {
      await removeMember(this.team.id_team, memberId);
      document.querySelector(`li[data-member-id="${memberId}"]`)?.remove();
      // Update counter
      const list = document.getElementById("membersList");
      const badge = document.querySelector(".cs-count-badge");
      if (badge && list) badge.textContent = list.querySelectorAll("li").length;
    } catch (err) {
      this._showFeedback(err?.message ?? t("common.error"), "error");
    }
  }

  handleCopyLink() {
    const link = `${window.location.origin}/join/${this.team?.id_team ?? ""}`;
    navigator.clipboard.writeText(link).then(() => {
      const btn = document.getElementById("copyInviteLinkBtn");
      if (!btn) return;
      btn.textContent = "✓ " + t("settings.copied");
      setTimeout(() => {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          ${t("settings.copyInviteLink")}`;
      }, 2000);
    });
  }

  // ─────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────
  _showFeedback(message, type = "success") {
    if (type === "success") {
      toast.success(t("common.successTitle"), message);
    } else {
      toast.error(t("common.errorTitle"), message);
    }
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Re-export for convenience
export { updateTeam, updateProject };
