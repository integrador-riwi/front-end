import "../assets/styles/publicProfile.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar.js";
import { getInitials, getCurrentUser } from "../utils/helpers.js";
import { t, onLangChange } from "../utils/i18n.js";
import { getPublicProfile } from "../services/api.js";

export default class PublicProfileView {
    constructor(router, params) {
        this.router = router;
        this.userId = params.userId;
        this.user = getCurrentUser();
        this.navbar = new Navbar(router);

        this.profileData = null;
        this.isLoading = true;
        this.error = null;

        // Modal / Detail state
        this.selectedProject = null;

        this.init();
    }

    async init() {
        await this.loadProfile();
        this._offLangChange = onLangChange(() => this.render());
    }

    async loadProfile() {
        try {
            this.isLoading = true;
            this.render(); // Show loading state

            const data = await getPublicProfile(this.userId);
            this.profileData = data;
            this.error = null;
        } catch (err) {
            console.error("Error loading public profile:", err);
            this.error = err.message || t("common.error");
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    _computeStats(projects) {
        const count = projects.length;
        const graded = projects.filter(p => p.project_final_grade != null);
        const avg = graded.length > 0
            ? Math.round(graded.reduce((s, p) => s + Number(p.project_final_grade), 0) / graded.length)
            : null;
        const best = graded.length > 0
            ? Math.max(...graded.map(p => Number(p.project_final_grade)))
            : null;
        return { count, avg, best };
    }

    render() {
        const app = document.getElementById("app");
        if (!app) return;

        if (this.isLoading) {
            app.innerHTML = `
                ${this.navbar.render()}
                <main class="coder-home-main public-profile-viewport d-flex justify-content-center align-items-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">${t("common.loading")}</span>
                    </div>
                </main>
            `;
            this.navbar.attachEventHandlers();
            return;
        }

        if (this.error) {
            app.innerHTML = `
                ${this.navbar.render()}
                <main class="coder-home-main public-profile-viewport d-flex flex-column justify-content-center align-items-center">
                    <div class="text-center p-5">
                        <span class="material-icons-round text-danger mb-3" style="font-size: 3rem;">error_outline</span>
                        <h2 class="fw-bold">${t("common.errorTitle")}</h2>
                        <p class="text-muted">${this.error}</p>
                        <button class="btn btn-primary px-4 mt-3" id="retryBtn">${t("common.retry")}</button>
                    </div>
                </main>
            `;
            this.navbar.attachEventHandlers();
            document.getElementById("retryBtn")?.addEventListener("click", () => this.loadProfile());
            return;
        }

        if (!this.profileData) {
            app.innerHTML = `<div class="p-5 text-center">No profile data found.</div>`;
            return;
        }

        const { name, role, clan, profile_description, github_avatar_url, github_username, projects = [] } = this.profileData;

        const viewerRole = this.user?.role;
        const safeProjects = Array.isArray(projects) ? projects : [];
        const filteredProjects = viewerRole === "CODER"
            ? safeProjects.filter(p => p.event_status === 'COMPLETED')
            : safeProjects;

        const stats = this._computeStats(filteredProjects);

        app.innerHTML = `
            ${this.navbar.render()}
            <main class="coder-home-main public-profile-viewport">
                <!-- Hero Banner -->
                <div class="pp-hero">
                    <div class="pp-hero-pattern"></div>
                    <button class="pp-back-btn" id="ppBackBtn">
                        <span class="material-icons-round" style="font-size:1.1rem">arrow_back</span>
                        ${t("common.back") || "Back"}
                    </button>
                </div>

                <div class="container-xl px-3 px-md-4">
                    <!-- Profile Card -->
                    <div class="pp-profile-card p-4 mb-4">
                        <div class="d-flex flex-column flex-md-row align-items-center align-items-md-end gap-3 gap-md-4">
                            <!-- Avatar -->
                            <div class="pp-avatar mx-auto mx-md-0">
                                ${github_avatar_url
                ? `<img src="${github_avatar_url}" alt="${name}" class="pp-avatar-img">`
                : `<span>${getInitials(name)}</span>`
            }
                            </div>
                            <!-- Info -->
                            <div class="text-center text-md-start flex-grow-1 pb-1">
                                <h1 class="pp-name mb-1">${name}</h1>
                                <span class="pp-role">${role}</span>
                                <div class="d-flex flex-column flex-md-row align-items-center gap-3 mt-2">
                                    <span class="pp-clan-badge">
                                        <span class="material-icons-round">groups</span>
                                        ${clan || t("publicProfile.noClan") || "No Clan"}
                                    </span>
                                    ${github_username ? `
                                        <a href="https://github.com/${github_username}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="background-color: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); display: inline-flex; align-items: center; gap: 8px; border-radius: 8px; padding: 4px 12px; font-weight: 500; transition: all 0.2s ease;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
                                            </svg>
                                            ${t("publicProfile.viewGithub") || "View GitHub profile"}
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Stats Row -->
                        <div class="pp-stats-row mt-4">
                            <div class="pp-stat-item pp-animate-in" style="animation-delay: 0.1s">
                                <div class="pp-stat-value">${stats.count}</div>
                                <div class="pp-stat-label">${t("tl.projects") || "Projects"}</div>
                            </div>
                            <div class="pp-stat-item pp-animate-in" style="animation-delay: 0.2s">
                                <div class="pp-stat-value">${stats.avg != null ? stats.avg : "—"}</div>
                                <div class="pp-stat-label">${t("publicProfile.avgGrade") || "Avg Grade"}</div>
                            </div>
                            <div class="pp-stat-item pp-animate-in" style="animation-delay: 0.3s">
                                <div class="pp-stat-value">${stats.best != null ? stats.best : "—"}</div>
                                <div class="pp-stat-label">${t("publicProfile.bestGrade") || "Best Grade"}</div>
                            </div>
                        </div>

                        <!-- Description -->
                        ${profile_description ? `
                            <div class="pp-description-box mt-4 pp-animate-in" style="animation-delay: 0.35s">
                                <p class="pp-label mb-2">${t("profile.description")}</p>
                                <p class="pp-description-text mb-0">${profile_description}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Projects Section -->
                    <div class="mb-5">
                        <h2 class="pp-section-title mb-4">
                            <span class="material-icons-round" style="color: var(--color-primary)">work_outline</span>
                            ${t("tl.projects") || "Projects"}
                            <span class="pp-project-count">${filteredProjects.length}</span>
                        </h2>

                        <div class="row g-4">
                            ${filteredProjects.length > 0 ? filteredProjects.map((proj, idx) => `
                                <div class="col-12 col-md-6 col-lg-4 pp-animate-in" style="animation-delay: ${0.1 + idx * 0.08}s">
                                    <div class="pp-project-card" data-project-id="${proj.id_project}">
                                        <div class="pp-project-img-wrapper">
                                            <img src="${proj.preview_photo_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=500&q=80'}" 
                                                 class="pp-project-img" alt="${proj.name}">
                                            <div class="pp-project-img-overlay"></div>
                                            <span class="pp-project-view-hint">
                                                <span class="material-icons-round" style="font-size:0.9rem">open_in_new</span>
                                                ${t("common.viewDetails") || "View Details"}
                                            </span>
                                        </div>
                                        <div class="pp-project-body">
                                            <h3 class="pp-project-title">${proj.name}</h3>
                                            <p class="pp-project-desc">${proj.description || ""}</p>
                                            <div class="pp-project-footer">
                                                <span class="pp-event-name">${proj.event_name || "Event"}</span>
                                                ${proj.project_final_grade != null ? `
                                                    <span class="pp-grade-badge ${this._getGradeClass(proj.project_final_grade)}">
                                                        ${proj.project_final_grade}/100
                                                    </span>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="col-12">
                                    <div class="pp-empty-state">
                                        <span class="material-icons-round pp-empty-icon">folder_off</span>
                                        <p class="pp-empty-title">${t("browseProjects.noProjects") || "No projects yet"}</p>
                                        <p class="pp-empty-text">${t("publicProfile.noProjectsHint") || "This user hasn't participated in any events yet."}</p>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </main>
        `;

        this.navbar.attachEventHandlers();
        this._attachProjectLinks();
        this._attachBackButton();
    }

    _attachBackButton() {
        document.getElementById("ppBackBtn")?.addEventListener("click", () => {
            this.router.back();
        });
    }

    _attachProjectLinks() {
        const cards = document.querySelectorAll(".pp-project-card");
        cards.forEach(card => {
            card.addEventListener("click", () => {
                const projectId = card.dataset.projectId;
                const project = this.profileData.projects.find(p => p.id_project == projectId);
                if (project && project.team_id) {
                    this.router.navigate("teamDetail", { teamId: project.team_id });
                }
            });
        });
    }
    _getGradeClass(grade) {
        if (grade >= 90) return "pp-grade-excellent";
        if (grade >= 75) return "pp-grade-good";
        if (grade >= 60) return "pp-grade-average";
        return "pp-grade-low";
    }

    destroy() {
        if (this._offLangChange) this._offLangChange();
    }
}