import "../assets/styles/profile.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar.js";
import { getInitials, getCurrentUser } from "../utils/helpers.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
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
    this.profileForm = { description: "", clan: this.user?.clan ?? "" };
    this.isLoading = true;
    this.isSaving = false;
    this.errorMessage = "";
    this.successMessage = "";
    this.githubStatus = null;

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
      if (!this.user) this.user = getCurrentUser();

      const [data] = await Promise.all([
        getMyProfile(),
        this.loadGithubStatus(),
      ]);

      const profile = data?.profile ?? {};
      const clanValue = profile.clan ?? data?.clan ?? this.user?.clan ?? "";

      this.profileDetails = { ...profile, clan: clanValue };
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
        t("profile.loading");
      this.profileDetails = this.profileDetails || {
        github_username: "",
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
            <span class="visually-hidden">${t("common.loading")}</span>
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
      : (this.profileDetails?.github_username ? `https://github.com/${this.profileDetails.github_username}` : null);

    const statusLabel = githubConnected
      ? githubExpired
        ? (t("profile.githubExpired") ?? "Expired")
        : (t("profile.githubConnected") ?? "Connected")
      : t("profile.notConnected");

    const showGithubLink =
      githubConnected && (githubUsername || githubProfileUrl);
    const showConnectBtn = !githubConnected || githubExpired;

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="coder-home-main profile-viewport">
        <div class="container-xl px-3 px-md-4 py-5">
          <div class="row g-4 justify-content-center">

            <div class="col-12 col-lg-5">
              <div class="bg-white rounded-4 p-4 ct-card-shadow text-center position-relative overflow-hidden">
                <div class="profile-card-topbar"></div>
                <div class="profile-avatar mb-3 d-flex align-items-center justify-content-center mx-auto mt-2">
                  ${githubAvatarUrl
        ? `<img src="${escapeHtml(githubAvatarUrl)}" alt="GitHub avatar" class="profile-avatar-img" />`
        : `<span class="profile-initials">${getInitials(this.user?.name ?? "User")}</span>`
      }
                </div>
                <h2 class="profile-name mb-1">${escapeHtml(this.user?.name ?? t("profile.defaultName") ?? "User Name")}</h2>
                <p class="profile-role mb-3">${escapeHtml(this.user?.role ?? "CODER")}</p>
                <div class="clan-badge mx-auto d-inline-block">
                  ${t("profile.clan")}: ${escapeHtml(this.profileForm.clan || "N/A")}
                </div>
                <div class="mt-4 profile-card-details text-start">
                  <p class="profile-label mb-1">${t("profile.email")}</p>
                  <p class="profile-value">${escapeHtml(this.user?.email ?? "user@example.com")}</p>
                  <div class="mt-3">
                    <p class="profile-label mb-1">${t("profile.github")}</p>
                    <div class="container align-items-center px-0 d-flex justify-content-between">
                      ${showGithubLink
        ? `<a class="profile-link" href="${escapeHtml(githubProfileUrl)}" target="_blank">@${escapeHtml(githubUsername ?? githubProfileUrl)}</a>`
        : `<p class="profile-value">${t("profile.notConnected")}</p>`
      }
                      <div class="profile-github-status">
                        <span class="status-pill ${githubConnected && !githubExpired ? "status-ok" : "status-warn"}">${escapeHtml(statusLabel)}</span>
                        ${showConnectBtn
        ? `<button type="button" class="profile-github-btn" id="connectGithubBtn">${githubExpired ? (t("profile.githubReconnect") ?? "Reconnect with GitHub") : (t("profile.githubConnect") ?? "Connect with GitHub")}</button>`
        : ""
      }
                    <div class="d-flex align-items-center justify-content-between gap-2 profile-github-section">

                      <!-- Left -->
                      ${showGithubLink
        ? `<a class="profile-link" href="${escapeHtml(githubProfileUrl)}" target="_blank">
                            @${escapeHtml(githubUsername ?? githubProfileUrl)}
                          </a>`
        : `<span class="profile-value mb-0">—</span>`
      }

                      <!-- Right -->
                      <div class="d-flex align-items-center justify-content-between w-100 profile-github-status">
                        <span class="status-pill ${githubConnected && !githubExpired ? 'status-ok' : 'status-warn'}">
                          ${escapeHtml(statusLabel)}
                        </span>
                        ${showConnectBtn
        ? `<button type="button" class="profile-github-btn" id="connectGithubBtn">
                              ${githubExpired
          ? (t("profile.githubReconnect") ?? "Reconnect")
          : (t("profile.githubConnect") ?? "Connect")}
                            </button>`
        : ''
      }
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-lg-7">
              <div class="bg-white rounded-4 p-4 ct-card-shadow text-start">
                <h2 class="profile-section-title mb-3">${t("profile.edit")}</h2>
                <form id="profileForm" class="profile-form">
                  <div class="profile-form-field">
                    <label class="profile-label" for="description">${t("profile.description")}</label>
                    <textarea id="description" name="description" rows="4" class="profile-input"
                      placeholder="${t("profile.placeholderDescription")}">${escapeHtml(this.profileForm.description)}</textarea>
                  </div>
                  <div class="profile-form-field">
                    <label class="profile-label" for="clan">${t("profile.clan")}</label>
                    <input id="clan" name="clan" type="text" class="profile-input"
                      value="${escapeHtml(this.profileForm.clan || "N/A")}"
                      readonly style="opacity:0.6;cursor:not-allowed;background:var(--color-bg,#f3f4f8);" />
                    <p class="cs-hint mt-1" style="font-size:0.78rem;color:var(--text-muted);">${t("profile.clanHint")}</p>
                  </div>
                  <button type="submit" class="profile-btn" ${this.isSaving ? "disabled" : ""}>
                    ${this.isSaving ? t("common.loading") : t("common.save")}
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
    if (this.errorMessage || this.successMessage) this._showBanner();
    if (!this._offLangChange) {
      this._offLangChange = onLangChange(() => this.render());
    }
  }

  attachEventHandlers() {
    const form = document.getElementById("profileForm");
    form?.addEventListener("submit", (e) => this.handleSave(e));

    form?.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener("input", (event) => {
        const { name, value } = event.target;
        if (!name) return;
        this.profileForm = { ...this.profileForm, [name]: value };
        this.errorMessage = "";
        this.successMessage = "";
      });
    });

    const githubBtn = document.getElementById("connectGithubBtn");
    githubBtn?.addEventListener("click", async () => {
      try {
        const url = await getGithubAuthUrl();
        if (!url) throw new Error("No se pudo obtener la URL de GitHub");
        window.location.href = url;
      } catch (error) {
        console.error("Error al obtener URL de GitHub", error);
        this.errorMessage = error?.message || t("common.error");
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
      this.profileDetails = { ...this.profileDetails, ...updatedProfile };
      this.profileForm = {
        description: updatedProfile.description ?? this.profileForm.description,
        clan: this.profileForm.clan,
      };
      this.successMessage =
        t("profile.savedOk") ?? "Profile updated correctly.";
    } catch (error) {
      console.error("Error updating profile", error);
      this.errorMessage =
        error?.response?.data?.message || error?.message || t("common.error");
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
    btn.textContent = loading ? t("common.loading") : t("common.save");
  }

  _showBanner() {
    if (this.errorMessage) {
      toast.error(t("common.errorTitle"), this.errorMessage);
    } else if (this.successMessage) {
      toast.success(t("common.successTitle"), this.successMessage);
    }
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
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
