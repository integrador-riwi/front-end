import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";
import "../assets/styles/coderTeam.css";
import { apiFetch } from "../services/api.js";

export default class TeamDetailView {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.teamId = params.teamId;
  }

  _isAdmin() {
    return this.user?.role === "ADMIN";
  }

  async render() {
    if (!this._isAdmin()) {
      this.router.navigate("projects");
      return;
    }

    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div style="display:flex;flex-direction:column;width:100%">
        ${this.header.render()}
        <main class="dashboard-main" id="teamDetailMain">
          <div class="container-xl px-3 px-md-4 py-4">
            <div class="d-flex align-items-center gap-2 mb-4">
              <div style="width:120px;height:16px;border-radius:8px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:800px 100%;animation:shimmer 1.4s infinite;"></div>
            </div>
            <div class="row g-4">
              <div class="col-12 col-lg-8">
                <div style="height:220px;border-radius:16px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:800px 100%;animation:shimmer 1.4s infinite;"></div>
              </div>
              <div class="col-12 col-lg-4">
                <div style="height:220px;border-radius:16px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:800px 100%;animation:shimmer 1.4s infinite;"></div>
              </div>
            </div>
          </div>
        </main>
      </div>`;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();
    this._injectStyles();

    await this._loadAndRender();
  }

  async _loadAndRender() {
    const main = document.getElementById("teamDetailMain");

    try {
      const membersRes = await apiFetch(`/teams/${this.teamId}/members`, { method: "GET" });
      const members = membersRes?.data?.members ?? [];

      let project = null;
      try {
        const projectRes = await apiFetch(`/teams/${this.teamId}/project`, { method: "GET" });
        project = projectRes?.data?.project ?? projectRes?.data ?? projectRes ?? null;
      } catch {
        project = null;
      }

      const teamName = members[0]?.team_name ?? `Equipo #${this.teamId}`;
      main.innerHTML = this._buildLayout({ name: teamName, members, project });
      this._attachHandlers();

    } catch (err) {
      console.error("TeamDetailView error:", err);
      main.innerHTML = `
        <div class="container-xl px-3 px-md-4 py-4">
          <div class="bg-white rounded-4 p-5 ct-card-shadow text-center">
            <span class="material-icons-round" style="font-size:2.5rem;color:var(--text-muted);">error_outline</span>
            <p class="mt-3" style="color:var(--text-muted);">No se pudo cargar el equipo. Intenta de nuevo.</p>
            <button class="ct-btn-post mt-2" id="tdBackBtn">Volver a equipos</button>
          </div>
        </div>`;
      document.getElementById("tdBackBtn")
          ?.addEventListener("click", () => this.router.navigate("projects"));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Layout principal — misma estructura que coderTeam
  // ─────────────────────────────────────────────────────────────
  _buildLayout({ name: teamName, members, project }) {
    const projectName  = project?.name        ?? teamName;
    const projectDesc  = project?.description ?? "Sin descripción aún.";
    const isSubmitted  = !!project?.submitted_at;
    const repoUrl      = project?.repo_url    ?? null;
    const clan         = members[0]?.clan     ?? null;

    const deliverables = project ? {
      video_url:        project.video_url        ?? null,
      preview_photo_url: project.preview_photo_url ?? null,
      presentation_url: project.presentation_url ?? null,
      deploy_url:       project.deploy_url       ?? null,
    } : null;

    return `
      <div class="container-xl px-3 px-md-4 py-4">

        <!-- Back button -->
        <button class="td-back-btn mb-4" id="tdBackBtn">
          <span class="material-icons-round" style="font-size:1.1rem;vertical-align:middle;">arrow_back</span>
          Volver a equipos
        </button>

        <div class="row g-4 align-items-start coderteam-container">

          <!-- ══ LEFT COLUMN ══ -->
          <div class="col-12 col-lg-8 d-flex flex-column gap-4">

            <!-- Hero card -->
            <div class="ct-hero-card rounded-4 p-4">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                ${clan ? `<span class="app-project-badge engineering">${clan}</span>` : "<span></span>"}
                ${isSubmitted
        ? `<span style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:700;padding:4px 12px;border-radius:999px;background:#dcfce7;color:#16a34a;">
                       <span class="material-icons-round" style="font-size:0.95rem;">check_circle</span> Entregado
                     </span>`
        : `<span style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:700;padding:4px 12px;border-radius:999px;background:#fef9c3;color:#a16207;">
                       <span class="material-icons-round" style="font-size:0.95rem;">schedule</span> En progreso
                     </span>`}
              </div>

              <h1 class="ct-hero-title mb-1">${projectName}</h1>
              <p class="ct-hero-tagline mb-0">${projectDesc}</p>

              <div class="d-flex flex-wrap gap-4 pt-3 mt-3 ct-stats-divider">

                <!-- Repo -->
                <div class="d-flex flex-column gap-1">
                  <span class="ct-stat-label">Repo Link</span>
                  ${repoUrl
        ? `<a href="${repoUrl}" target="_blank" rel="noopener"
                          class="ct-stat-value ct-repo-link"
                          style="color:var(--color-primary);text-decoration:none;">
                         <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;margin-right:4px;">
                           <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                         </svg>
                         View Repo
                       </a>`
        : `<span class="ct-stat-value" style="opacity:0.5;">Sin repositorio</span>`}
                </div>

                <!-- Mini avatars -->
                <div class="d-flex flex-column gap-1">
                  <span class="ct-stat-label">Team</span>
                  <div class="ct-mini-avatars mt-1">
                    ${members.slice(0, 3).map(m =>
        `<div class="ct-mini-avatar">${m.name.charAt(0)}</div>`
    ).join("")}
                    ${members.length > 3
        ? `<div class="ct-mini-avatar ct-mini-more">+${members.length - 3}</div>`
        : ""}
                  </div>
                </div>

              </div>
            </div>

            <!-- Deliverables (read-only) -->
            <div class="bg-white rounded-4 p-4 ct-card-shadow">
              <div class="d-flex align-items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                     style="width:16px;height:16px;flex-shrink:0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h2 class="ct-section-title mb-0">Deliverables</h2>
                <span class="ms-auto" style="font-size:0.78rem;color:var(--text-muted);">
                  ${this._deliverableCount(deliverables, repoUrl)}/4 submitted
                </span>
              </div>

              ${project
        ? this._renderDeliverables(deliverables, repoUrl)
        : `<p style="color:var(--text-muted);font-size:0.875rem;text-align:center;padding:2rem 0;">
                     Este equipo aún no tiene un proyecto registrado.
                   </p>`}
            </div>

          </div>

          <!-- ══ RIGHT COLUMN ══ -->
          <div class="col-12 col-lg-4 coderteam-right-col d-flex flex-column gap-4 team-details">
            <div class="bg-white rounded-4 p-4 ct-card-shadow d-flex flex-column">

              <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3"
                   style="border-color:var(--border)!important;">
                <h2 class="ct-section-title mb-0">Project Team</h2>
              </div>

              ${members.length === 0
        ? `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem 0;">
                     Sin miembros registrados.
                   </p>`
        : `<ul class="list-unstyled d-flex flex-column gap-1 mb-0">
                    ${members.map((m, i) => `
                      <li class="ct-member-item d-flex align-items-center gap-3 rounded-3 px-2 py-2">
                        ${m.github_avatar_url
            ? `<img src="${m.github_avatar_url}" alt="${m.name}"
                                  class="ct-avatar-md flex-shrink-0"
                                  style="border-radius:50%;object-fit:cover;">`
            : `<div class="ct-avatar-md ct-avatar-color-${i % 4} flex-shrink-0">
                               ${m.name.charAt(0)}
                             </div>`}
                        <div class="overflow-hidden">
                          <p class="ct-member-name text-truncate mb-0">${m.name}</p>
                          <p class="ct-member-role mb-0">${m.team_role ?? m.role ?? "Member"}</p>
                        </div>
                      </li>`).join("")}
                   </ul>`}

            </div>
          </div>

        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────
  // Deliverables — solo lectura para el ADMIN
  // ─────────────────────────────────────────────────────────────
  _renderDeliverables(d, repoUrl) {
    const items = [
      { key: "video_url",         label: "Pitch Video",    url: d?.video_url         ?? null, icon: "videocam",   color: "var(--color-accent)"   },
      { key: "repo_url",          label: "Repository",     url: repoUrl,                      icon: "code",       color: "var(--color-success)"  },
      { key: "preview_photo_url", label: "Preview Photo",  url: d?.preview_photo_url ?? null, icon: "image",      color: "var(--color-warning)"  },
      { key: "deploy_url",        label: "Deploy Link",    url: d?.deploy_url        ?? null, icon: "open_in_new",color: "var(--color-primary)"  },
    ];

    return `
      <div class="d-flex flex-column gap-2">
        ${items.map(item => `
          <div class="d-flex align-items-center justify-content-between gap-3 rounded-3 px-3 py-3
                      ct-deliverable-item ${item.url ? "ct-deliverable-done" : "ct-deliverable-pending"}">

            <div class="d-flex align-items-center gap-3 overflow-hidden flex-grow-1 flex-shrink-1 min-w-0">
              <div class="ct-del-icon flex-shrink-0"
                   style="background:${item.color}22;color:${item.color};">
                <span class="material-icons-round" style="font-size:1rem;">${item.icon}</span>
              </div>
              <div class="overflow-hidden">
                <span class="ct-del-label d-block text-truncate">${item.label}</span>
                <span class="ct-del-status ${item.url ? "ct-status-done" : "ct-status-pending"}">
                  ${item.url ? "Submitted" : "Pending"}
                </span>
              </div>
            </div>

            <div class="d-flex align-items-center gap-2 flex-shrink-0">
              ${item.url
        ? `<a href="${item.url}" target="_blank" rel="noopener" class="ct-btn-open">Open</a>`
        : `<span style="font-size:0.78rem;color:var(--text-muted);">—</span>`}
            </div>

          </div>`).join("")}
      </div>`;
  }

  _deliverableCount(d, repoUrl) {
    return [d?.video_url, repoUrl, d?.preview_photo_url, d?.deploy_url]
        .filter(Boolean).length;
  }

  // ─────────────────────────────────────────────────────────────
  _attachHandlers() {
    document.getElementById("tdBackBtn")
        ?.addEventListener("click", () => this.router.navigate("projects"));
  }

  _injectStyles() {
    if (document.getElementById("td-base-styles")) return;
    const s = document.createElement("style");
    s.id = "td-base-styles";
    s.textContent = `
      @keyframes shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position:  400px 0; }
      }
      .td-back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: none;
        border: none;
        color: var(--color-primary, #6366f1);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        transition: opacity .2s;
      }
      .td-back-btn:hover { opacity: .65; }

      /* Clickable cards en TeamsAndProjects */
      .td-clickable {
        cursor: pointer;
        transition: transform .18s, box-shadow .18s;
      }
      .td-clickable:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,.1);
      }
      .td-view-detail-hint {
        font-size: 0.75rem;
        color: var(--color-primary, #6366f1);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        opacity: 0;
        transition: opacity .2s;
      }
      .td-clickable:hover .td-view-detail-hint { opacity: 1; }
    `;
    document.head.appendChild(s);
  }
}
