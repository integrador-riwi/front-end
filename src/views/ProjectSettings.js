import Navbar from "../components/navbar/navbar.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/projectSettings.css";
import {
  apiFetch,
  updateTeam,
  updateProject,
  inviteMember,
  removeMember,
  getAvailableCoders,
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
            <span class="cs-bc-link" data-route="coderHome">Home</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-current">Settings</span>
          </nav>
          <div class="d-flex align-items-center justify-content-center" style="min-height: 300px;">
            <span class="cs-loading">Loading…</span>
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
            <span class="cs-bc-link" data-route="coderHome">Home</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-link">${escHtml(projectName || teamName)}</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-current">Settings</span>
          </nav>

          <h1 class="cs-page-title mb-1">Project Settings</h1>
          <p class="cs-page-sub mb-4">Manage project details, external links, and team member permissions.</p>

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
                  General Information
                </h2>
                <div class="d-flex flex-column gap-3">
                  <div>
                    <label class="cs-label">Project Name</label>
                    <input type="text" class="cs-input" id="settingProjectName"
                           value="${escHtml(projectName)}" placeholder="Enter project name" />
                  </div>
                  <div>
                    <label class="cs-label">Description</label>
                    <textarea class="cs-input cs-textarea" id="settingProjectDesc"
                              placeholder="Describe your project...">${escHtml(projectDesc)}</textarea>
                  </div>
                  <div>
                    <label class="cs-label">Repository URL</label>
                    <div class="cs-input-icon-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                           class="cs-input-icon">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                      </svg>
                      <input type="url" class="cs-input cs-input-with-icon" id="settingRepoUrl"
                             value="${escHtml(repoUrl)}" placeholder="https://github.com/team/repo"
                             ${repoUrl ? "readonly title='El repo se asigna automáticamente al crear el proyecto'" : ""} />
                    </div>
                    ${repoUrl ? `<p class="cs-hint mt-1">El repositorio fue creado automáticamente y no puede editarse aquí.</p>` : ""}
                  </div>
                  <div class="d-flex justify-content-end">
                    <button class="cs-btn-primary" id="saveSettingsBtn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                           style="width:15px;height:15px">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <!-- Danger Zone -->
              <div class="cs-danger-card rounded-4 p-4">
                <h2 class="cs-danger-title mb-1">Danger Zone</h2>
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <p class="cs-danger-sub mb-0">Permanently delete this team and all its data.</p>
                  <button class="cs-btn-danger" id="deleteProjectBtn">Delete Team</button>
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
                  Team Management
                </h2>
                <p class="cs-card-sub mb-4">Manage members and roles.</p>

                <!-- Invite by search -->
                <p class="cs-label">INVITE NEW MEMBER</p>
                <div class="position-relative mb-2">
                  <input type="text" class="cs-input" id="inviteSearchInput"
                         placeholder="Search coder by name or email…" autocomplete="off" />
                  <div id="inviteDropdown" class="cs-invite-dropdown" style="display:none;"></div>
                </div>
                <div class="mb-4" id="inviteFeedback"></div>

                <!-- Members -->
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="cs-label mb-0">Current Members</span>
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
                  Copy Invite Link
                </button>

              </div>
            </div>

          </div>
        </div>
      </main>
    `;

    this.navbar.attachEventHandlers();
    this.attachEventHandlers();
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
            ${isMe ? `<span class="cs-you-tag">You</span>` : ""}
          </p>
          <p class="cs-member-role mb-0">${isLead ? "Lead" : "Member"}</p>
        </div>
        ${
          isLead
            ? `<span class="cs-lead-badge">LEAD</span>`
            : `<button class="cs-btn-remove" data-member-id="${m.id_user}" data-member-name="${escHtml(m.name)}" title="Remove">
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

    // Invite search with debounce
    const searchInput = document.getElementById("inviteSearchInput");
    let debounceTimer;
    searchInput?.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(
        () => this._fetchInviteSuggestions(e.target.value),
        400,
      );
    });
    searchInput?.addEventListener("blur", () => {
      setTimeout(() => {
        const dropdown = document.getElementById("inviteDropdown");
        if (dropdown) dropdown.style.display = "none";
      }, 200);
    });
  }

  // ─────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────
  async handleSave() {
    const btn = document.getElementById("saveSettingsBtn");
    const name = document.getElementById("settingProjectName")?.value.trim();
    const description = document
      .getElementById("settingProjectDesc")
      ?.value.trim();

    if (!name) {
      this._showFeedback(
        "El nombre del proyecto no puede estar vacío.",
        "error",
      );
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving…";
    }

    try {
      const projectId =
        this.project?.id_project ?? this.team?.project?.id_project;
      if (projectId) {
        await updateProject(projectId, { name, description });
      } else {
        // No project yet — update team name as fallback
        await updateTeam(this.team.id_team, { name });
      }
      this._showFeedback("Changes saved successfully.", "success");
    } catch (err) {
      this._showFeedback(err?.message ?? "Could not save changes.", "error");
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
      "¿Seguro que quieres eliminar el equipo? Esta acción es permanente y no se puede deshacer.",
    );
    if (!confirmed) return;

    try {
      // Backend only allows ADMIN to delete via DELETE /teams/:id
      // Leader leaves team which triggers auto-delete when alone, or use leave endpoint
      const { leaveTeam } = await import("../services/api.js");
      await leaveTeam(this.team.id_team);
      this.router.navigate("coderHome");
    } catch (err) {
      this._showFeedback(
        err?.message ?? "No se pudo eliminar el equipo.",
        "error",
      );
    }
  }

  async handleRemoveMember(memberId, memberName) {
    const confirmed = confirm(`¿Remover a ${memberName} del equipo?`);
    if (!confirmed) return;

    try {
      await removeMember(this.team.id_team, memberId);
      document.querySelector(`li[data-member-id="${memberId}"]`)?.remove();
      // Update counter
      const list = document.getElementById("membersList");
      const badge = document.querySelector(".cs-count-badge");
      if (badge && list) badge.textContent = list.querySelectorAll("li").length;
    } catch (err) {
      this._showFeedback(
        err?.message ?? "No se pudo remover el miembro.",
        "error",
      );
    }
  }

  async _fetchInviteSuggestions(query) {
    const dropdown = document.getElementById("inviteDropdown");
    if (!dropdown) return;

    if (!query || query.length < 2) {
      dropdown.style.display = "none";
      return;
    }

    dropdown.style.display = "block";
    dropdown.innerHTML = `<div class="cs-invite-hint">Buscando…</div>`;

    try {
      const res = await getAvailableCoders(this.team.id_team, query);
      const data = res?.data ?? res;
      const coders = data?.coders ?? [];

      if (coders.length === 0) {
        dropdown.innerHTML = `<div class="cs-invite-hint">No se encontraron coders disponibles.</div>`;
        return;
      }

      dropdown.innerHTML = coders
        .map(
          (c) => `
        <div class="cs-invite-option" data-user-id="${c.id_user}">
          <div class="cs-invite-avatar">${c.name?.charAt(0) ?? "?"}</div>
          <div>
            <div class="cs-invite-name">${escHtml(c.name)}</div>
            <div class="cs-invite-email">${escHtml(c.email)}</div>
          </div>
          ${
            c.hasPendingInvitation
              ? `<span class="cs-invite-sent">Invitado</span>`
              : `<button class="cs-invite-btn" data-user-id="${c.id_user}">Invitar</button>`
          }
        </div>
      `,
        )
        .join("");

      dropdown.querySelectorAll(".cs-invite-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this._sendInvite(btn);
        });
      });
    } catch (err) {
      dropdown.innerHTML = `<div class="cs-invite-hint cs-invite-error">${err?.message ?? "Error al buscar."}</div>`;
    }
  }

  async _sendInvite(btn) {
    const userId = btn.dataset.userId;
    btn.disabled = true;
    btn.textContent = "Enviando…";
    try {
      await inviteMember(this.team.id_team, Number(userId));
      btn.textContent = "✓ Invitado";
      btn.classList.add("cs-invite-sent");
      const feedback = document.getElementById("inviteFeedback");
      if (feedback) {
        feedback.innerHTML = `<span style="color:#16a34a;font-size:0.85rem;">✓ Invitación enviada.</span>`;
        setTimeout(() => {
          feedback.innerHTML = "";
        }, 3000);
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Invitar";
      const feedback = document.getElementById("inviteFeedback");
      if (feedback) {
        feedback.innerHTML = `<span style="color:#dc2626;font-size:0.85rem;">${err?.message ?? "No se pudo enviar."}</span>`;
      }
    }
  }

  handleCopyLink() {
    const link = `${window.location.origin}/join/${this.team?.id_team ?? ""}`;
    navigator.clipboard.writeText(link).then(() => {
      const btn = document.getElementById("copyInviteLinkBtn");
      if (!btn) return;
      btn.textContent = "✓ Copied!";
      setTimeout(() => {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Invite Link`;
      }, 2000);
    });
  }

  // ─────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────
  _showFeedback(message, type = "success") {
    const el = document.getElementById("cs-feedback");
    if (!el) return;
    el.style.display = "block";
    el.className = `mb-3 alert ${type === "success" ? "alert-success" : "alert-danger"} rounded-4`;
    el.textContent = message;
    setTimeout(() => {
      el.style.display = "none";
    }, 4000);
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
