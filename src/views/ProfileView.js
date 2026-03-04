import "../assets/styles/profile.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar.js";
import { getInitials, getCurrentUser } from "../utils/helpers.js";
import {
  getMyProfile,
  getGithubStatus,
  getGithubAuthUrl,
  updateProfile,
} from "../services/api.js";
import { updateUser } from "../utils/auth.js";

export default class ProfileView {
  constructor(router) {
    this.router = router;
    this.user = getCurrentUser();
    this.navbar = new Navbar(router);
    this.navbar.setActiveRoute("profile");

    this.profileDetails = null;
    this.profileForm = {
      description: "",
      clan: this.user?.clan ?? "",
    };
    this.isLoading = true;
    this.isSaving = false;
    this.errorMessage = "";
    this.successMessage = "";
    this.githubStatus = null;

    // Leer params del router
    const params = router.currentParams ?? {};
    if (params.githubSuccess) {
      this.successMessage = `GitHub conectado correctamente${params.githubUsername ? ` como @${params.githubUsername}` : ""}.`;
    }
    if (params.githubError) {
      this.errorMessage = `Error al conectar GitHub: ${params.githubError}`;
    }

    this.loadProfile();
  }

  async loadProfile() {
    try {
      if (!this.user) {
        this.user = getCurrentUser();
      }

      const data = await getMyProfile();
      const profile = data?.profile ?? {};
      const clanValue = profile.clan ?? data?.clan ?? this.user?.clan ?? "";

      this.profileDetails = {
        ...profile,
        clan: clanValue,
      };

      this.profileForm = {
        description: profile.description ?? "",
        clan: clanValue,
      };

      this.user =
        updateUser({
          id_user: data?.id_user ?? this.user?.id_user,
          name: data?.name ?? this.user?.name,
          email: data?.email ?? this.user?.email,
          role: data?.role ?? this.user?.role,
          clan: data?.clan ?? clanValue,
        }) || this.user;

      this.errorMessage = "";
    } catch (error) {
      console.error("Failed to load profile", error);
      this.errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo cargar tu perfil.";
      this.profileDetails = this.profileDetails || {
        github_url: "",
        description: "",
        clan: this.profileForm.clan,
      };
    } finally {
      await this.loadGithubStatus();
      this.isLoading = false;
      this.render();
    }
  }

  async loadGithubStatus() {
    try {
      this.githubStatus = await getGithubStatus();
    } catch (error) {
      console.warn("No se pudo obtener el estado de GitHub", error);
      this.githubStatus = null;
    }
  }

  render() {
    const app = document.getElementById("app");

    if (this.isLoading) {
      app.innerHTML = `
              ${this.navbar.render()}
              <main class="coder-home-main d-flex justify-content-center align-items-center" style="min-height: 100vh;">
                  <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                  </div>
              </main>
           `;
      this.navbar.attachEventHandlers();
      return;
    }

    const githubUsername = this.githubStatus?.github?.username ?? null;
    const githubConnected = this.githubStatus?.connected === true;
    const githubExpired = this.githubStatus?.expired === true;
    const githubProfileUrl = githubUsername
      ? `https://github.com/${githubUsername}`
      : this.profileDetails?.github_url || null;

    const statusLabel = githubConnected
      ? githubExpired
        ? "Conexión expirada"
        : "Conectado"
      : "No conectado";

    // showLink: connected AND we have a username or url
    const showGithubLink =
      githubConnected && (githubUsername || githubProfileUrl);
    // showBtn: not connected at all, OR connected but token expired
    const showConnectBtn = !githubConnected || githubExpired;
    app.innerHTML = `
      ${this.navbar.render()}
      <main class="coder-home-main profile-viewport">
        <div class="container-xl px-3 px-md-4 py-5">
            <div class="row g-4 justify-content-center">
                <div class="col-12 col-md-5 col-lg-4">
                   <div class="bg-white rounded-4 p-4 ct-card-shadow text-center position-relative overflow-hidden">
                     <div class="profile-card-topbar"></div>
                     <div class="profile-avatar mb-3 d-flex align-items-center justify-content-center mx-auto mt-2">
                       <span class="profile-initials">${getInitials(this.user?.name ?? "User")}</span>
                     </div>
                     <h2 class="profile-name mb-1">${escapeHtml(this.user?.name ?? "User Name")}</h2>
                     <p class="profile-role mb-3">${escapeHtml(this.user?.role ?? "CODER")}</p>
                     <div class="clan-badge mx-auto d-inline-block">
                       Clan: ${escapeHtml(this.profileForm.clan || "N/A")}
                     </div>
                     <div class="mt-4 profile-card-details text-start">
                       <p class="profile-label mb-1">Email</p>
                       <p class="profile-value">${escapeHtml(this.user?.email ?? "user@example.com")}</p>
                        <div class="mt-3">
                          <p class="profile-label mb-1">GitHub</p>
                          ${
                            showGithubLink
                              ? `<a class="profile-link" href="${escapeHtml(githubProfileUrl)}" target="_blank">@${escapeHtml(githubUsername ?? githubProfileUrl)}</a>`
                              : `<p class="profile-value">Sin conexión</p>`
                          }
                          <div class="profile-github-status">
                            <span class="status-pill ${githubConnected && !githubExpired ? "status-ok" : "status-warn"}">${escapeHtml(statusLabel)}</span>
                            ${
                              showConnectBtn
                                ? `<button type="button" class="profile-github-btn" id="connectGithubBtn">${githubExpired ? "Reconectar GitHub" : "Conectar GitHub"}</button>`
                                : ``
                            }
                          </div>
                        </div>
                      </div>
                   </div>
                </div>

                <div class="col-12 col-md-7 col-lg-8">
                   <div class="bg-white rounded-4 p-4 ct-card-shadow text-start">
                     <h2 class="profile-section-title mb-3">Editar perfil</h2>
                     ${this.errorMessage ? `<div class="profile-alert profile-alert-error mb-3">${escapeHtml(this.errorMessage)}</div>` : ""}
                     ${this.successMessage ? `<div class="profile-alert profile-alert-success mb-3">${escapeHtml(this.successMessage)}</div>` : ""}
                      <form id="profileForm" class="profile-form">
                        <div class="profile-form-field">
                          <label class="profile-label" for="description">Descripción</label>
                          <textarea id="description" name="description" rows="4" class="profile-input" placeholder="Háblanos de tu experiencia">${escapeHtml(this.profileForm.description)}</textarea>
                        </div>
                        <div class="profile-form-field">
                          <label class="profile-label" for="clan">Clan</label>
                          <input id="clan" name="clan" type="text" class="profile-input" placeholder="Nombre del clan" value="${escapeHtml(this.profileForm.clan)}" />
                        </div>
                       <button type="submit" class="profile-btn" ${this.isSaving ? "disabled" : ""}>
                         ${this.isSaving ? "Guardando..." : "Guardar cambios"}
                       </button>
                     </form>
                   </div>
                </div>
            </div>
        </div>
      </main>
    `;

    this.navbar.attachEventHandlers();
    this.attachEventHandlers();
  }

  attachEventHandlers() {
    const form = document.getElementById("profileForm");
    form?.addEventListener("submit", (e) => this.handleSave(e));

    form?.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener("input", (event) => {
        const { name, value } = event.target;
        if (!name) return;
        this.profileForm = {
          ...this.profileForm,
          [name]: value,
        };
        this.errorMessage = "";
        this.successMessage = "";
      });
    });

    const githubBtn = document.getElementById("connectGithubBtn");
    githubBtn?.addEventListener("click", async () => {
      try {
        const url = await getGithubAuthUrl();
        if (!url) {
          throw new Error("No se pudo obtener la URL de GitHub");
        }
        window.location.href = url;
      } catch (error) {
        console.error("Error al obtener URL de GitHub", error);
        this.errorMessage =
          error?.message || "No se pudo iniciar la conexión con GitHub.";
        this.render();
      }
    });
  }

  async handleSave(event) {
    event.preventDefault();

    if (this.isSaving) return;

    this.isSaving = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.render();

    try {
      const updatedProfile = await updateProfile({
        description: this.profileForm.description,
        clan: this.profileForm.clan,
      });

      this.profileDetails = {
        ...this.profileDetails,
        ...updatedProfile,
      };

      const clanValue = updatedProfile.clan ?? this.profileForm.clan;
      this.profileForm = {
        description: updatedProfile.description ?? this.profileForm.description,
        clan: clanValue,
      };

      this.user = updateUser({ clan: clanValue }) || this.user;
      this.successMessage = "Perfil actualizado correctamente.";
    } catch (error) {
      console.error("Error updating profile", error);
      this.errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo guardar el perfil.";
    } finally {
      this.isSaving = false;
      this.render();
    }
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
