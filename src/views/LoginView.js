import { saveSession } from "../utils/auth.js";
import { loginUser } from "../services/api.js";
import { renderErrorBox } from "../utils/helpers.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/login.css";

export default class LoginView {
  constructor(router) {
    this.router = router;
    this.email = "";
    this.password = "";
    this.error = "";
    this.loading = false;
  }

  render() {
    const app = document.getElementById("app");
    app.innerHTML = `

      <main class="login-shell">


        <!-- ── LEFT PANEL ── -->
        <section class="login-left d-none d-md-flex flex-column justify-content-center align-items-center">
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
          <div class="blob blob-3"></div>
          <div class="left-content text-center px-5">
            <h1 class="left-title">TeamUp</h1>
            <p class="left-desc">
            ${t("login.leftDesc")}
            </p>
            <div class="left-tags d-flex flex-wrap justify-content-center gap-2 mt-4">
              <span class="tag tag-lilac">${t("login.collaborate")}</span>
              <span class="tag tag-mint">${t("login.track")}</span>
              <span class="tag tag-gold">${t("login.grow")}</span>
            </div>
          </div>
        </section>

        <!-- ── RIGHT PANEL ── -->
        <section class="login-right d-flex align-items-center justify-content-center">
          <div class="form-card w-100">

            <!-- Mobile-only app name -->
            <div class="d-flex d-md-none justify-content-center mb-2">
              <span class="mobile-app-name">TeamUp</span>
            </div>

            <header class="form-header mb-4">
              <p class="form-eyebrow">${t("login.welcome")}</p>
              <h2 class="form-title">${t("login.title")}</h2>
              <p class="form-subtitle">${t("login.subtitle")}</p>
            </header>

            ${renderErrorBox(this.error)}

            <form id="loginForm" novalidate>

              <!-- Email -->
              <div class="mb-3">
                <label for="email" class="form-label field-label">${t("login.email")}</label>
                <div class="input-wrap">
                  <input id="email" type="email" class="form-control custom-input"
                         placeholder="name@correo.com"
                         autocomplete="email" required value="${this.email}" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
              </div>

              <!-- Password -->
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label for="password" class="form-label field-label mb-0">${t("login.password")}</label>
                </div>
                <div class="input-wrap">
                  <input id="password" type="password" class="form-control custom-input"
                         placeholder="••••••••"
                         autocomplete="current-password" required />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>

              <button type="submit" class="btn btn-submit w-100 mt-1" id="submitBtn"
                      ${this.loading ? "disabled" : ""}>
                ${
                  this.loading
                    ? `<span class="login-spinner"></span>`
                    : t("login.submit")
                }
              </button>

              <div class="text-center mt-3">
                <a href="#" id="registerLink" class="forgot-link">
                  ${t("login.noAccount")}
                </a>
              </div>

            </form>

            <div class="accent-bar d-flex gap-1 mt-4">
              <span style="background:#6b5cff;"></span>
              <span style="background:#eaa2fc;"></span>
              <span style="background:#5acca4;"></span>
              <span style="background:#fe654f;"></span>
              <span style="background:#e6ca52;"></span>
            </div>

          </div>
        </section>

      </main>
    `;

    this.attachEventHandlers();
    this._offLangChange = onLangChange(() => this.render());
  }

  attachEventHandlers() {
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    emailInput.addEventListener("input", (e) => {
      this.email = e.target.value;
    });
    passwordInput.addEventListener("input", (e) => {
      this.password = e.target.value;
    });
    form.addEventListener("submit", (e) => this.handleLogin(e));


    document.getElementById("registerLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.router.navigate("register");
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    this.loading = true;
    this.error = "";
    this.render();

    try {
      const response = await loginUser(this.email, this.password);
      saveSession(response.data.token, response.data.refreshToken, response.data.user);
      // Limpiar la última ruta guardada para que init() use el home correcto del rol
      sessionStorage.removeItem("lastRoute");
      this.router.init();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || t("login.error");
      toast.error(t("login.errorTitle"), errorMessage);
      this.loading = false;
      this.render();
    }
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}