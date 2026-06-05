import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/projects.css";
import "../assets/styles/components.css";
import { apiFetch } from "../services/api.js";

export default class BrowseProjects {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this._offLangChange = null;
  }

  showLoading(container) {
    container.innerHTML = `
    <div class="col-12 w-100 h-100 d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border" role="status" style="width:2.5rem;height:2.5rem;color:var(--color-primary);">
        <span class="visually-hidden">${t("browseProjects.loading")}</span>
      </div>
    </div>`;
  }

  showEmpty(container) {
    container.innerHTML = `
    <div class="col-12 py-5 text-center">
      <span class="material-icons-round" style="font-size:3rem;color:var(--text-muted);">folder_off</span>
      <p class="app-page-title mt-2 mb-1" style="font-size:1rem;">${t("browseProjects.noProjects")}</p>
      <p class="text-muted small">${t("browseProjects.noProjectsDesc")}</p>
    </div>`;
  }

  async render() {
    const app = document.getElementById("app");

    app.innerHTML = `
      ${this.navbar.render()}
      <div style="display: flex; flex-direction: column; width: 100%; min-height: 100vh; background-color: var(--color-bg, #f4f6f8);">
        ${this.header.render()}
        
        <!-- Hero Section -->
        <div class="bp-hero py-5" style="background: linear-gradient(135deg, var(--navy, #1e293b) 0%, var(--accent-dark, #4338ca) 100%); position: relative; overflow: hidden;">
          <div class="bp-hero-pattern" style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0.1; background-image: radial-gradient(var(--mint, #10b981) 1px, transparent 1px); background-size: 20px 20px;"></div>
          <div class="container-fluid px-4 px-md-5 position-relative z-1">
            <div class="d-flex align-items-center gap-3 mb-2">
              <div class="p-2 rounded-circle" style="background: rgba(255,255,255,0.1); color: var(--mint, #10b981);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h1 class="fw-bolder mb-0 text-white" style="font-size: 2.5rem; letter-spacing: -0.5px;">${t("browseProjects.title")}</h1>
            </div>
            <p class="mb-0 mt-2" style="color: rgba(255,255,255,0.8); font-size: 1.1rem; max-width: 600px;">
              ${t("browseProjects.subtitle")}
            </p>
          </div>
        </div>

        <main class="dashboard-main flex-grow-1 pb-5">
          <div class="container-fluid px-4 px-md-5 mt-5">
            <div id="projectsContainer" class="row gx-4 gy-5"></div>
          </div>
        </main>
      </div>

      <style>
        .bp-card {
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.05);
          background: #fff;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .bp-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.08);
          border-color: rgba(0,0,0,0.1);
        }
        .bp-card-img-wrap {
          position: relative;
          height: 200px;
          border-radius: 20px 20px 0 0;
          overflow: hidden;
        }
        .bp-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .bp-card:hover .bp-card-img {
          transform: scale(1.05);
        }
        .bp-team-badge {
          position: absolute;
          bottom: 15px;
          left: 15px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          backdrop-filter: blur(4px);
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bp-card-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .bp-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--navy, #1e293b);
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .bp-desc {
          font-size: 0.9rem;
          color: var(--text-muted, #64748b);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .bp-deliverables {
          margin-top: auto;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 20px;
          border-top: 1px solid var(--border, #e2e8f0);
        }
        .bp-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .bp-btn-deploy {
          background: color-mix(in srgb, var(--color-primary, #6b5cff), transparent 90%);
          color: var(--color-primary, #6b5cff);
        }
        .bp-btn-deploy:hover { background: var(--color-primary, #6b5cff); color: #fff; }
        .bp-btn-repo {
          background: color-mix(in srgb, var(--navy, #1e293b), transparent 90%);
          color: var(--navy, #1e293b);
        }
        .bp-btn-repo:hover { background: var(--navy, #1e293b); color: #fff; }
        .bp-btn-video {
          background: color-mix(in srgb, var(--coral, #fe654f), transparent 90%);
          color: var(--coral, #fe654f);
        }
        .bp-btn-video:hover { background: var(--coral, #fe654f); color: #fff; }
        .bp-btn-pres {
          background: color-mix(in srgb, var(--accent, #6b5cff), transparent 90%);
          color: var(--accent, #6b5cff);
        }
        .bp-btn-pres:hover { background: var(--accent, #6b5cff); color: #fff; }
      </style>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();
    await this.renderProjectsGrid();

    this._offLangChange = onLangChange(() => this.render());
  }

  async renderProjectsGrid() {
    const container = document.getElementById("projectsContainer");
    if (!container) return;

    this.showLoading(container);

    try {
      const response = await apiFetch("/projects?limit=100", { method: "GET" });
      const projects = response.data?.projects || [];

      // Ensure the project has completely been graded to be visible to others
      const displayProjects = projects.filter(p => p.project_final_grade !== null && p.project_final_grade !== undefined);

      if (displayProjects.length === 0) {
        this.showEmpty(container);
        return;
      }

      container.innerHTML = "";

      displayProjects.forEach((project) => {
        // Collect deliverables to show
        let deliverablesHtml = "";
        
        if (project.deploy_url) {
          deliverablesHtml += `<a href="${project.deploy_url}" target="_blank" class="bp-btn bp-btn-deploy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Deploy</a>`;
        }
        if (project.repo_url) {
          deliverablesHtml += `<a href="${project.repo_url}" target="_blank" class="bp-btn bp-btn-repo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg> Repo</a>`;
        }
        if (project.video_url) {
          deliverablesHtml += `<a href="${project.video_url}" target="_blank" class="bp-btn bp-btn-video"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polygon points="5 3 19 12 5 21 5 3"/></svg> Pitch ES</a>`;
        }
        if (project.presentation_url) {
          deliverablesHtml += `<a href="${project.presentation_url}" target="_blank" class="bp-btn bp-btn-pres"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polygon points="5 3 19 12 5 21 5 3"/></svg> Pitch EN</a>`;
        }

        if (!deliverablesHtml) {
          deliverablesHtml = `<span class="text-muted small w-100 text-center py-2 bg-light rounded-3">${t("browseProjects.noDeliverables")}</span>`;
        }

        // Preview photo or placeholder
        const imgUrl = project.preview_photo_url || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80";

        const teamName = project.team_name || "Unknown Team";

        const card = `
          <div class="col-12 col-md-6 col-lg-4 col-xl-3">
            <div class="bp-card">
              <div class="bp-card-img-wrap">
                <img src="${imgUrl}" class="bp-card-img" alt="Preview Photo">
                <div class="bp-team-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  ${teamName}
                </div>
              </div>
              <div class="bp-card-body">
                <h5 class="bp-title">${project.name || t("browseProjects.untitled")}</h5>
                <p class="bp-desc">${project.description || t("browseProjects.noDesc")}</p>
                <div class="bp-deliverables">
                  ${deliverablesHtml}
                </div>
              </div>
            </div>
          </div>
        `;

        container.insertAdjacentHTML("beforeend", card);
      });

    } catch (err) {
      console.error("Error fetching projects:", err);
      container.innerHTML = `<div class="col-12 text-center text-danger">${t("browseProjects.errorLoading")}</div>`;
    }
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
