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
      this.successMessage = `Github connected correctly${params.githubUsername ? ` as @${params.githubUsername}` : ""}.`;
    }
    if (params.githubError) {
      this.errorMessage = `Github connection error: ${params.githubError}`;
    }

    this.loadProfile();
  }

  async loadProfile() {
    try {
      if (!this.user) {
        this.user = getCurrentUser();
      }

      const [data] = await Promise.all([
        getMyProfile(),
        this.loadGithubStatus(),
      ]);

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
          github_avatar_url:
            data?.github_avatar_url ?? this.user?.github_avatar_url ?? null,
        }) || this.user;

      this.errorMessage = "";
    } catch (error) {
      console.error("Failed to load profile", error);
      this.errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Profile could not be loaded.";
      this.profileDetails = this.profileDetails || {
        github_url: "",
        description: "",
        clan: this.profileForm.clan,
      };
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  async loadGithubStatus() {
    try {
      this.githubStatus = await getGithubStatus();
      // Persist avatar to localStorage so navbar and other views can use it
      if (this.githubStatus?.github?.avatarUrl) {
        updateUser({ github_avatar_url: this.githubStatus.github.avatarUrl });
        this.user = getCurrentUser();
      }
    } catch (error) {
      console.warn("Github status is not available", error);
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
    const githubAvatarUrl = this.githubStatus?.github?.avatarUrl ?? null;
    const githubProfileUrl = githubUsername
      ? `https://github.com/${githubUsername}`
      : this.profileDetails?.github_url || null;

    const statusLabel = githubConnected
      ? githubExpired
        ? "Expired connection"
        : "Connected"
      : "Not connected";

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
                <div class="col-12 col-md-6 col-lg-5">
                   <div class="bg-white rounded-4 p-4 ct-card-shadow text-center position-relative overflow-hidden">
                     <div class="profile-card-topbar"></div>
                     <div class="profile-avatar mb-3 d-flex align-items-center justify-content-center mx-auto mt-2">
                       ${
                         githubAvatarUrl
                           ? `<img src="${escapeHtml(githubAvatarUrl)}" alt="GitHub avatar" class="profile-avatar-img" />`
                           : `<span class="profile-initials">${getInitials(this.user?.name ?? "User")}</span>`
                       }
                     </div>
                     <h2 class="profile-name mb-1">${escapeHtml(this.user?.name ?? "User Name")}</h2>
                     <p class="profile-role mb-3">${escapeHtml(this.user?.role ?? "CODER")}</p>
                     <div class="clan-badge mx-auto d-inline-block">
                       Clan: ${escapeHtml(this.profileForm.clan || "N/A")}
                     </div>
                     <div class="mt-4 profile-card-details text-start">
                       <p class="profile-label mb-0">Email</p>
                       <p class="profile-value w-100">${escapeHtml(this.user?.email ?? "user@example.com")}</p>
                        <div class="mt-3">
                          <p class="profile-label mb-1">GitHub</p>
                          <div class="container align-items-center px-0 d-flex justify-content-between">
                            ${
                              showGithubLink
                                ? `<a class="profile-link" href="${escapeHtml(githubProfileUrl)}" target="_blank">@${escapeHtml(githubUsername ?? githubProfileUrl)}</a>`
                                : `<p class="profile-value">Not connected</p>`
                            }
                            <div class="profile-github-status">
                              <span class="status-pill ${githubConnected && !githubExpired ? "status-ok" : "status-warn"}">${escapeHtml(statusLabel)}</span>
                              ${
                                showConnectBtn
                                  ? `<button type="button" class="profile-github-btn" id="connectGithubBtn">${githubExpired ? "Reconnect with GitHub" : "Connect with GitHub"}</button>`
                                  : ``
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                   </div>
                </div>

                <div class="col-12 col-md-6 col-lg-7">
                   <div class="bg-white rounded-4 p-4 ct-card-shadow text-start">
                     <h2 class="profile-section-title mb-3">Edit your profile</h2>
                      <form id="profileForm" class="profile-form">
                        <div class="profile-form-field">
                          <label class="profile-label" for="description">Description</label>
                          <textarea id="description" name="description" rows="4" class="profile-input" placeholder="Tell us about your experience...">${escapeHtml(this.profileForm.description)}</textarea>
                        </div>
                        <div class="profile-form-field">
                          <label class="profile-label" for="clan">Clan</label>
                          <input id="clan" name="clan" type="text" class="profile-input" value="${escapeHtml(this.profileForm.clan || "N/A")}"
                                 readonly style="opacity:0.6;cursor:not-allowed;background:var(--color-bg,#f3f4f8);" />
                          <p class="cs-hint mt-1" style="font-size:0.78rem;color:var(--text-muted);">The clan is assigned by an administrator.</p>
                        </div>
                       <button type="submit" class="profile-btn align-self-center" ${this.isSaving ? "disabled" : ""}>
                         ${this.isSaving ? "Saving..." : "Save changes"}
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

    // Show OAuth redirect messages (github success/error params)
    if (this.errorMessage || this.successMessage) this._showBanner();
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
        this.errorMessage = error?.message || "Could not connect to GitHub.";
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
    this._setSaveBtn(true);

    try {
      const updatedProfile = await updateProfile({
        description: this.profileForm.description,
      });

      this.profileDetails = {
        ...this.profileDetails,
        ...updatedProfile,
      };

      this.profileForm = {
        description: updatedProfile.description ?? this.profileForm.description,
        clan: this.profileForm.clan,
      };
      this.successMessage = "Profile updated correctly.";
    } catch (error) {
      console.error("Error updating profile", error);
      this.errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Error updating profile.";
    } finally {
      this.isSaving = false;
      this._setSaveBtn(false);
      this._showBanner();
    }
  }

  _setSaveBtn(loading) {
    const btn = document.querySelector(".profile-btn[type='submit']");
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Saving..." : "Save changes";
  }

  _showBanner() {
    const errorEl = document.querySelector(".profile-alert-error");
    const successEl = document.querySelector(".profile-alert-success");

    // Remove existing banners
    errorEl?.remove();
    successEl?.remove();

    if (!this.errorMessage && !this.successMessage) return;

    const banner = document.createElement("div");
    banner.className = `profile-alert ${this.errorMessage ? "profile-alert-error" : "profile-alert-success"} mb-3`;
    banner.textContent = this.errorMessage || this.successMessage;

    const form = document.getElementById("profileForm");
    form?.parentElement?.insertBefore(banner, form);

    // Auto-dismiss after 4s
    setTimeout(() => banner.remove(), 4000);
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
