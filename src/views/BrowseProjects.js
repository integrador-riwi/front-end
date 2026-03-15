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
      <div style="display: flex; flex-direction: column; width: 100%">
        ${this.header.render()}
        <main class="dashboard-main pb-5">
          <div class="container-fluid px-3 px-md-4 mt-4">
            <h2 class="fw-bold mb-2">${t("browseProjects.title")}</h2>
            <p class="text-muted mb-4">
              ${t("browseProjects.subtitle")}
            </p>
            
            <div id="projectsContainer" class="row gx-4 gy-4"></div>
          </div>
        </main>
      </div>
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
          deliverablesHtml += `<a href="${project.deploy_url}" target="_blank" class="btn btn-sm btn-outline-primary mb-1 me-1"><span class="material-icons-round fs-6 align-middle me-1">public</span>Deploy</a>`;
        }
        if (project.repo_url) {
          deliverablesHtml += `<a href="${project.repo_url}" target="_blank" class="btn btn-sm btn-outline-dark mb-1 me-1"><span class="material-icons-round fs-6 align-middle me-1">code</span>Repo</a>`;
        }
        if (project.video_url) {
          deliverablesHtml += `<a href="${project.video_url}" target="_blank" class="btn btn-sm btn-outline-danger mb-1 me-1"><span class="material-icons-round fs-6 align-middle me-1">play_circle</span>Video</a>`;
        }
        if (project.presentation_url) {
          deliverablesHtml += `<a href="${project.presentation_url}" target="_blank" class="btn btn-sm btn-outline-info mb-1 me-1"><span class="material-icons-round fs-6 align-middle me-1">description</span>${t("browseProjects.presentation")}</a>`;
        }

        if (!deliverablesHtml) {
          deliverablesHtml = `<span class="text-muted small">${t("browseProjects.noDeliverables")}</span>`;
        }

        // Preview photo or placeholder
        const imgUrl = project.preview_photo_url || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80";

        const card = `
          <div class="col-12 col-md-6 col-lg-4">
            <div class="card shadow-sm h-100 border-0" style="border-radius: 12px; overflow: hidden; background: #fff;">
              <img src="${imgUrl}" class="card-img-top" alt="Preview Photo" style="height: 180px; object-fit: cover;">
              <div class="card-body d-flex flex-column">
                <h5 class="card-title fw-bold text-dark mb-1">${project.name || t("browseProjects.untitled")}</h5>
                <p class="card-text text-muted small mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                  ${project.description || t("browseProjects.noDesc")}
                </p>
                <div class="mt-auto pt-3 border-top">
                  <h6 class="small fw-semibold text-muted text-uppercase mb-2">${t("browseProjects.deliverablesTitle")}</h6>
                  <div class="d-flex flex-wrap gap-1">
                    ${deliverablesHtml}
                  </div>
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
