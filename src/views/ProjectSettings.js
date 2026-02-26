import Navbar from "../components/navbar/navbar.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/projectSettings.css";

export default class ProjectSettings {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.team = null;
    this.project = null;
  }

  async render() {
    const app = document.getElementById("app");

    // TODO: replace with real API calls
    this.team = {
      name: "Alpha Squad",
      members: [{ name: "Alice", team_role: "LEADER" }, { name: "Bob", team_role: "MEMBER" }],
      project: {
        name: "Campus Navigator",
        description: "React Native app for campus navigation.",
        grade: 87.5,
        final_delivery_date: "2026-03-15",
        deliverables: {
          video_url: "https://youtube.com/watch?v=xxx",
          presentation_url: "https://slides.google.com/xxx",
          repo_url: "https://github.com/team/repo",
          preview_photo_url: null,
        }
      }
    }

    const { team } = this;
    const projectName = team?.name ?? "Untitled Project";
    const projectDesc = team?.description ?? "";
    const repoUrl = team?.repo_url ?? "";
    const members = team?.members ?? [];

    app.innerHTML = `
      ${this.navbar.render()}

      <main class="cs-main">
        <div class="container-xl px-3 px-md-4 py-4">

          <!-- Breadcrumb -->
          <nav class="cs-breadcrumb d-flex align-items-center gap-2 mb-3">
            <span class="cs-bc-link" data-route="coderHome">Home</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-link">${escHtml(projectName)}</span>
            <span class="cs-bc-sep">›</span>
            <span class="cs-bc-current">Settings</span>
          </nav>

          <h1 class="cs-page-title mb-1">Project Settings</h1>
          <p class="cs-page-sub mb-4">Manage project details, external links, and team member permissions.</p>

          <div class="row g-4 align-items-start">

            <!-- ══ LEFT ══ -->
            <div class="col-12 col-lg-8 d-flex flex-column gap-4">

              <!-- General Information -->
              <div class="bg-white rounded-4 p-4 cs-card">
                <h2 class="cs-card-title d-flex align-items-center gap-2 mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       style="width:18px;height:18px;color:var(--color-primary)">
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
                             value="${escHtml(repoUrl)}" placeholder="https://github.com/team/repo" />
                    </div>
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
                  <p class="cs-danger-sub mb-0">Permanently delete this project and all its data.</p>
                  <button class="cs-btn-danger" id="deleteProjectBtn">Delete Project</button>
                </div>
              </div>

            </div>

            <!-- ══ RIGHT ══ -->
            <div class="col-12 col-lg-4">
              <div class="bg-white rounded-4 p-4 cs-card">

                <h2 class="cs-card-title d-flex align-items-center gap-2 mb-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                       style="width:18px;height:18px;color:var(--color-primary)">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Team Management
                </h2>
                <p class="cs-card-sub mb-4">Manage members and roles.</p>

                <!-- Invite -->
                <p class="cs-label">INVITE NEW MEMBER</p>
                <div class="d-flex gap-2 mb-4">
                  <input type="email" class="cs-input flex-grow-1" id="inviteEmail"
                         placeholder="student@uni.edu" />
                  <button class="cs-btn-invite" id="inviteMemberBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                         style="width:14px;height:14px">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>

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
    const isLead = m.team_role === "LEADER" || i === 0;
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
        ${isLead
        ? `<span class="cs-lead-badge">LEAD</span>`
        : `<button class="cs-btn-remove" data-member-id="${m.id_user}" title="Remove">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
               </svg>
             </button>`
      }
      </li>
    `;
  }

  attachEventHandlers() {
    document.getElementById("saveSettingsBtn")?.addEventListener("click", () => this.handleSave());

    document.getElementById("deleteProjectBtn")?.addEventListener("click", () => this.handleDelete());

    document.getElementById("inviteMemberBtn")?.addEventListener("click", () => this.handleInvite());

    document.getElementById("inviteEmail")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleInvite();
    });

    document.getElementById("copyInviteLinkBtn")?.addEventListener("click", () => this.handleCopyLink());

    document.querySelectorAll(".cs-btn-remove").forEach(btn => {
      btn.addEventListener("click", () => this.handleRemoveMember(btn.dataset.memberId));
    });

    document.querySelector(".cs-bc-link[data-route]")?.addEventListener("click", (e) => {
      this.router.navigate(e.target.dataset.route);
    });
  }

  handleSave() {
    const name = document.getElementById("settingProjectName")?.value.trim();
    const desc = document.getElementById("settingProjectDesc")?.value.trim();
    const repo = document.getElementById("settingRepoUrl")?.value.trim();
    // TODO: await updateProject({ id: this.project.id_project, name, desc, repo_url: repo });
    console.log("Save settings:", { name, desc, repo });
  }

  handleDelete() {
    const confirmed = confirm("Are you sure? This will permanently delete the project and all its data.");
    if (!confirmed) return;
    // TODO: await deleteProject(this.project.id_project);
    console.log("Delete project");
  }

  handleInvite() {
    const email = document.getElementById("inviteEmail")?.value.trim();
    if (!email) return;
    // TODO: await inviteMember({ teamId: this.team.id_team, email });
    console.log("Invite:", email);
    document.getElementById("inviteEmail").value = "";
  }

  handleRemoveMember(memberId) {
    const confirmed = confirm("Remove this member from the team?");
    if (!confirmed) return;
    // TODO: await removeMember({ teamId: this.team.id_team, userId: memberId });
    document.querySelector(`li[data-member-id="${memberId}"]`)?.remove();
    console.log("Remove member:", memberId);
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
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}