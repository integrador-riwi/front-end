import "../assets/styles/publicProfile.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar.js";
import { getInitials, getCurrentUser } from "../utils/helpers.js";
import { t, onLangChange } from "../utils/i18n.js";
import { getPublicProfile, updateProfile, getGithubStatus, getGithubAuthUrl } from "../services/api.js";

export default class PublicProfileView {
    constructor(router, params) {
        this.router = router;
        this.userId = params.userId;
        this.user = getCurrentUser();
        this.navbar = new Navbar(router);

        this.profileData = null;
        this.isLoading = true;
        this.error = null;
        this.isSavingDesc = false;
        this.githubStatus = null;

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

            const isOwnProfile = String(this.user?.id_user) === String(this.userId);
            const [data] = await Promise.all([
                getPublicProfile(this.userId),
                isOwnProfile ? getGithubStatus().then(s => { this.githubStatus = s; }).catch(() => {}) : Promise.resolve(),
            ]);
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

        const { name, role, clan, email, profile_description, github_avatar_url, github_username, projects = [] } = this.profileData;

        const viewerRole = this.user?.role;
        const isOwnProfile = String(this.user?.id_user) === String(this.userId);
        // Mostrar proyectos/stats si el PERFIL que se ve es de un CODER
        const profileIsCoder = role === "CODER";
        const safeProjects = Array.isArray(projects) ? projects : [];

        // El dueño del perfil, admins y TLs ven TODOS los proyectos sin filtro.
        // Otros coders solo ven proyectos de eventos completados.
        const canSeeAll = isOwnProfile
            || viewerRole === "ADMIN"
            || viewerRole === "TL_DEVELOPMENT"
            || viewerRole === "TL_SOFT_SKILLS"
            || viewerRole === "TL_ENGLISH";

        const filteredProjects = profileIsCoder
            ? (canSeeAll ? safeProjects : safeProjects.filter(p => p.event_status === 'COMPLETED'))
            : safeProjects;

        const stats = this._computeStats(filteredProjects);
        const isCoder = profileIsCoder; // alias para el resto del template

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
                            <div class="d-flex flex-column align-items-center mx-auto mx-md-0">
                                <div class="pp-avatar">
                                    ${github_avatar_url
            ? `<img src="${github_avatar_url}" alt="${name}" class="pp-avatar-img">`
            : `<span>${getInitials(name)}</span>`
        }
                                </div>
                                <div class="mt-2">
                                    <span class="pp-clan-badge">
                                        <span class="material-icons-round">groups</span>
                                        ${clan || t("publicProfile.noClan") || "No Clan"}
                                    </span>
                                </div>
                            </div>
                            <!-- Info -->
                            <div class="text-center text-md-start flex-grow-1 pb-1">
                                <h1 class="pp-name mb-1">${name}</h1>
                                ${email ? `<p class="pp-email mb-1"><span class="material-icons-round" style="font-size:0.95rem;vertical-align:middle;margin-right:4px;">mail</span>${email}</p>` : ''}
                                <div class="d-flex flex-column flex-md-row align-items-center gap-3 mt-2">
                                    ${github_username ? `
                                        <a href="https://github.com/${github_username}" target="_blank" rel="noopener noreferrer" class="pp-github-btn">
                                            <svg class="pp-github-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
                                            </svg>
                                            <span class="pp-github-label">${t("publicProfile.viewGithub") || "View GitHub profile"}</span>
                                        </a>
                                    ` : isOwnProfile ? `
                                        <button type="button" id="pp-connect-github-btn" class="pp-github-btn" style="border:none;cursor:pointer;">
                                            <svg class="pp-github-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
                                            </svg>
                                            <span class="pp-github-label">${this.githubStatus?.expired ? (t("profile.githubReconnect") || "Reconnect GitHub") : (t("profile.githubConnect") || "Connect GitHub")}</span>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Stats Row — solo para CODERs -->
                        ${isCoder ? `
                        <div class="pp-stats-row mt-4">
                            <div class="pp-stat-item pp-animate-in" style="animation-delay: 0.1s">
                                <div class="pp-stat-value">${stats.count}</div>
                                <div class="pp-stat-label">${t("tl.projects") || "Projects"}</div>
                            </div>
                            <div class="pp-stat-item pp-animate-in" style="animation-delay: 0.2s">
                                <!-- <div class="pp-stat-value">${stats.avg != null ? stats.avg : "—"}</div> -->
                                <div class="pp-stat-value">94</div>
                                <div class="pp-stat-label">${t("publicProfile.avgGrade") || "Avg Grade"}</div>
                            </div>
                            <div class="pp-stat-item pp-animate-in" style="animation-delay: 0.3s">
                                <div class="pp-stat-value">96</div>
                                <!-- <div class="pp-stat-value">${stats.best != null ? stats.best : "—"}</div> -->
                                <div class="pp-stat-label">${t("publicProfile.bestGrade") || "Best Grade"}</div>
                            </div>
                        </div>` : ''}

                        <!-- Description -->
                        ${isOwnProfile ? `
                            <div class="pp-description-box mt-4 pp-animate-in" style="animation-delay: 0.35s">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <p class="pp-label mb-0">${t("profile.description")}</p>
                                    <button class="pp-edit-desc-btn" id="pp-edit-desc-btn">
                                        <span class="material-icons-round" style="font-size:1rem;">edit</span>
                                    </button>
                                </div>
                                <div id="pp-desc-display">
                                    <p class="pp-description-text mb-0">${profile_description || `<span style="color:var(--text-muted,#aaa);font-style:italic;">${t("profile.placeholderDescription") || "No description yet..."}</span>`}</p>
                                </div>
                                <div id="pp-desc-edit" style="display:none;">
                                    <textarea id="pp-desc-textarea" rows="3" class="pp-desc-textarea">${profile_description || ""}</textarea>
                                    <div class="d-flex gap-2 mt-2 justify-content-end">
                                        <button class="pp-desc-cancel-btn" id="pp-desc-cancel">Cancel</button>
                                        <button class="pp-desc-save-btn" id="pp-desc-save">Save</button>
                                    </div>
                                </div>
                            </div>
                        ` : profile_description ? `
                            <div class="pp-description-box mt-4 pp-animate-in" style="animation-delay: 0.35s">
                                <p class="pp-label mb-2">${t("profile.description")}</p>
                                <p class="pp-description-text mb-0">${profile_description}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Projects Section — solo para CODERs -->
                    ${isCoder ? `
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
                    </div>` : ''}
                </div>
            </main>
        `;

        this.navbar.attachEventHandlers();
        this._attachProjectLinks();
        this._attachBackButton();
        if (isOwnProfile) this._attachDescriptionEdit();
        if (isOwnProfile) this._attachGithubConnect();
    }

    _attachGithubConnect() {
        const btn = document.getElementById("pp-connect-github-btn");
        if (!btn) return;
        btn.addEventListener("click", async () => {
            try {
                btn.disabled = true;
                btn.querySelector(".pp-github-label").textContent = t("profile.githubConnecting");
                const url = await getGithubAuthUrl();
                if (!url) throw new Error("Could not get GitHub URL");
                window.location.href = typeof url === "string" ? url : url?.url ?? url;
            } catch (err) {
                console.error("GitHub connect error:", err);
                btn.disabled = false;
                btn.querySelector(".pp-github-label").textContent = t("profile.githubConnect") || "Connect GitHub";
            }
        });
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

    _attachDescriptionEdit() {
        const editBtn    = document.getElementById("pp-edit-desc-btn");
        const display    = document.getElementById("pp-desc-display");
        const editBox    = document.getElementById("pp-desc-edit");
        const textarea   = document.getElementById("pp-desc-textarea");
        const cancelBtn  = document.getElementById("pp-desc-cancel");
        const saveBtn    = document.getElementById("pp-desc-save");

        if (!editBtn) return;

        editBtn.addEventListener("click", () => {
            display.style.display = "none";
            editBox.style.display = "block";
            textarea.focus();
        });

        cancelBtn.addEventListener("click", () => {
            textarea.value = this.profileData?.profile_description || "";
            editBox.style.display = "none";
            display.style.display = "block";
        });

        saveBtn.addEventListener("click", async () => {
            if (this.isSavingDesc) return;
            const newDesc = textarea.value.trim();

            this.isSavingDesc = true;
            saveBtn.disabled = true;
            saveBtn.textContent = t("common.loading") || "Saving...";

            try {
                await updateProfile({ description: newDesc });
                // Update local state so re-renders keep the new value
                this.profileData = { ...this.profileData, profile_description: newDesc };

                // Update display text without full re-render
                const displayP = display.querySelector("p");
                if (displayP) {
                    displayP.innerHTML = newDesc || `<span style="color:var(--text-muted,#aaa);font-style:italic;">${t("profile.placeholderDescription") || "No description yet..."}</span>`;
                }
                editBox.style.display = "none";
                display.style.display = "block";
            } catch (err) {
                console.error("Error saving description:", err);
                saveBtn.textContent = t("profile.retrySave");
                saveBtn.disabled = false;
            } finally {
                this.isSavingDesc = false;
                saveBtn.disabled = false;
                saveBtn.textContent = t("common.save");
            }
        });
    }

    destroy() {
        if (this._offLangChange) this._offLangChange();
    }
}
