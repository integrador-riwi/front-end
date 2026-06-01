import { registerUser } from "../services/api.js";
import { renderErrorBox } from "../utils/helpers.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/login.css";

export default class RegisterView {
  constructor(router) {
    this.router = router;
    this.name = "";
    this.email = "";
    this.documentNumber = "";
    this.password = "";
    this.documentType = "CC";
    this.role = "CODER";
    this.clan = "";
    this.error = "";
    this.loading = false;
  }

  render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <button class="back-btn" id="backBtn">
          <span class="material-icons-round" style="font-size:1.1rem">arrow_back</span>
          ${t("common.back") || "Back"}
      </button>
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
              <p class="form-eyebrow">${t("register.welcome")}</p>
              <h2 class="form-title">${t("register.title")}</h2>
              <p class="form-subtitle">${t("register.subtitle")}</p>
            </header>

            ${renderErrorBox(this.error)}

            <form id="registerForm" novalidate>

              <div class="mb-3">
                <label for="name" class="form-label field-label">${t("register.name")}</label>
                <div class="input-wrap">
                  <input id="name" type="text" class="form-control custom-input"
                         placeholder="${t("register.namePlaceholder")}"
                         autocomplete="name" required value="${this.name}" />
                </div>
              </div>

              <div class="mb-3">
                <label for="email" class="form-label field-label">${t("register.email")}</label>
                <div class="input-wrap">
                  <input id="email" type="email" class="form-control custom-input"
                         placeholder="${t("register.emailPlaceholder")}"
                         autocomplete="email" required value="${this.email}" />
                </div>
              </div>

              <div class="row g-3">
                <div class="col-12 col-md-4">
                  <label for="documentType" class="form-label field-label">${t("register.documentType")}</label>
                  <select id="documentType" class="form-select custom-input">
                    <option value="CC" ${this.documentType === "CC" ? "selected" : ""}>CC</option>
                    <option value="TI" ${this.documentType === "TI" ? "selected" : ""}>TI</option>
                    <option value="CE" ${this.documentType === "CE" ? "selected" : ""}>CE</option>
                    <option value="PP" ${this.documentType === "PP" ? "selected" : ""}>PP</option>
                  </select>
                </div>
                <div class="col-12 col-md-8">
                  <label for="documentNumber" class="form-label field-label">${t("register.documentNumber")}</label>
                  <div class="input-wrap">
                    <input id="documentNumber" type="text" inputmode="numeric" class="form-control custom-input"
                           placeholder="${t("register.documentNumberPlaceholder")}"
                           required value="${this.documentNumber}" />
                  </div>
                </div>
              </div>

              <div class="mb-3 mt-2">
                <label for="clan" class="form-label field-label">${t("register.clan")}</label>
                <select id="clan" class="form-select custom-input">
                  <option value="" ${!this.clan ? "selected" : ""} disabled>${t("register.clanPlaceholder")}</option>
                  <option value="Magdalena" ${this.clan === "Magdalena" ? "selected" : ""}>Magdalena</option>
                  <option value="Esthercita" ${this.clan === "Esthercita" ? "selected" : ""}>Esthercita</option>
                  <option value="Garabato" ${this.clan === "Garabato" ? "selected" : ""}>Garabato</option>
                  <option value="Micaela" ${this.clan === "Micaela" ? "selected" : ""}>Micaela</option>
                  <option value="Cayena" ${this.clan === "Cayena" ? "selected" : ""}>Cayena</option>
                  <option value="Malecón" ${this.clan === "Malecón" ? "selected" : ""}>Malecón</option>
                  <option value="Cortissoz" ${this.clan === "Cortissoz" ? "selected" : ""}>Cortissoz</option>
                  <option value="Turing" ${this.clan === "Turing" ? "selected" : ""}>Turing</option>
                  <option value="Tesla" ${this.clan === "Tesla" ? "selected" : ""}>Tesla</option>
                  <option value="McCarthy" ${this.clan === "McCarthy" ? "selected" : ""}>McCarthy</option>
                  <option value="Hamilton" ${this.clan === "Hamilton" ? "selected" : ""}>Hamilton</option>
                  <option value="Thompson" ${this.clan === "Thompson" ? "selected" : ""}>Thompson</option>
                  <option value="Nakamoto" ${this.clan === "Nakamoto" ? "selected" : ""}>Nakamoto</option>
                </select>
              </div>

              <div class="mb-3 mt-2">
                <label for="password" class="form-label field-label">${t("register.password")}</label>
                <div class="input-wrap">
                  <input id="password" type="password" class="form-control custom-input"
                         placeholder="••••••••"
                         autocomplete="new-password" required />
                </div>
              </div>

              <button type="submit" class="btn btn-submit w-100 mt-1" id="submitBtn"
                      ${this.loading ? "disabled" : ""}>
                ${
                  this.loading
                    ? `<span class="login-spinner"></span>`
                    : t("register.submit")
                }
              </button>

              <div class="text-center mt-3">
                <a href="#" id="loginLink" class="forgot-link">
                  ${t("register.haveAccount")}
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
    const form = document.getElementById("registerForm");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const documentTypeInput = document.getElementById("documentType");
    const documentNumberInput = document.getElementById("documentNumber");
    const clanInput = document.getElementById("clan");
    const passwordInput = document.getElementById("password");

    nameInput?.addEventListener("input", (e) => {
      this.name = e.target.value;
    });
    emailInput?.addEventListener("input", (e) => {
      this.email = e.target.value;
    });
    documentTypeInput?.addEventListener("change", (e) => {
      this.documentType = e.target.value;
    });
    documentNumberInput?.addEventListener("input", (e) => {
      this.documentNumber = e.target.value;
    });
    clanInput?.addEventListener("change", (e) => {
      this.clan = e.target.value;
    });
    passwordInput?.addEventListener("input", (e) => {
      this.password = e.target.value;
    });

    form?.addEventListener("submit", (e) => this.handleRegister(e));

    document.getElementById("backBtn")?.addEventListener("click", () => {
      this.router.navigate("login");
    });

    document.getElementById("loginLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.router.navigate("login");
    });
  }

  async handleRegister(e) {
    e.preventDefault();
    this.loading = true;
    this.error = "";
    this.render();

    try {
      const docValue = (this.documentNumber || "").trim();
      const docAsNumber = docValue ? Number(docValue) : null;
      const documentNumber = Number.isFinite(docAsNumber) ? docAsNumber : docValue;

      const payload = {
        name: this.name.trim(),
        email: this.email.trim(),
        documentNumber,
        password: this.password,
        documentType: this.documentType,
        role: this.role || "CODER",
        clan: this.clan.trim(),
      };

      await registerUser(payload);
      toast.success(t("register.successTitle"), t("register.successMsg"));
      setTimeout(() => this.router.navigate("login"), 1200);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || t("register.error");
      this.error = errorMessage;
      toast.error(t("register.errorTitle"), errorMessage);
      this.loading = false;
      this.render();
    }
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}