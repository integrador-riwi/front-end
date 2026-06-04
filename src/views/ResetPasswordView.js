import { resetPassword } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import "../assets/styles/login.css";

/**
 * ResetPasswordView
 * Reads ?token= from URL, lets the user set a new password.
 * Token is sent to the backend which verifies the hash.
 */
export default class ResetPasswordView {
  constructor(router) {
    this.router = router;
    this.token = null;
    this.loading = false;
    this.done = false;
    this.tokenMissing = false;
    this.showPassword = false;
    this.showConfirm = false;
  }

  render() {
    // Extract token from URL query string
    const params = new URLSearchParams(window.location.search);
    this.token = params.get("token");
    if (!this.token) this.tokenMissing = true;

    const app = document.getElementById("app");
    app.innerHTML = `
      <main class="login-shell">

        <!-- LEFT PANEL -->
        <section class="login-left d-none d-md-flex flex-column justify-content-center align-items-center">
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
          <div class="blob blob-3"></div>
          <div class="left-content text-center px-5">
            <h1 class="left-title">TeamUp</h1>
            <p class="left-desc">
              Crea una contraseña segura. Te recomendamos combinar letras, números y símbolos.
            </p>
          </div>
        </section>

        <!-- RIGHT PANEL -->
        <section class="login-right d-flex align-items-center justify-content-center">
          <div class="form-card w-100">

            <div class="d-flex d-md-none justify-content-center mb-2">
              <span class="mobile-app-name">TeamUp</span>
            </div>

            ${this.tokenMissing
              ? this._renderInvalid()
              : this.done
                ? this._renderSuccess()
                : this._renderForm()}

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

      <style>
        .rp-strength-bar {
          height: 4px;
          border-radius: 99px;
          transition: width 0.3s ease, background 0.3s ease;
          margin-top: 6px;
        }
        .rp-strength-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .rp-toggle-eye {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          color: var(--text-muted);
          background: none;
          border: none;
          padding: 0;
          display: flex;
          align-items: center;
          z-index: 2;
        }
        .rp-toggle-eye:hover { color: var(--color-primary); }
      </style>
    `;

    if (!this.tokenMissing && !this.done) this._attachHandlers();
  }

  _renderForm() {
    return `
      <header class="form-header mb-4">
        <p class="form-eyebrow">Seguridad de cuenta</p>
        <h2 class="form-title">Nueva contraseña</h2>
        <p class="form-subtitle">Crea una contraseña segura para tu cuenta de TeamUp.</p>
      </header>

      <form id="resetForm" novalidate>

        <!-- New Password -->
        <div class="mb-3">
          <label for="newPassword" class="form-label field-label">Nueva contraseña</label>
          <div class="input-wrap" style="position:relative;">
            <input id="newPassword" type="password" class="form-control custom-input"
                   placeholder="Mínimo 8 caracteres" autocomplete="new-password"
                   style="padding-right: 46px;" />
            <button type="button" class="rp-toggle-eye" id="toggleNew" title="Mostrar contraseña">
              <svg id="eyeNew" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:18px;height:18px;">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <!-- Password strength meter -->
          <div style="background: rgba(0,0,0,0.05); border-radius:99px; overflow:hidden; margin-top:8px; height:4px;">
            <div id="strengthBar" class="rp-strength-bar" style="width:0%;background:#e2e8f0;"></div>
          </div>
          <div id="strengthLabel" class="rp-strength-label" style="color: var(--text-muted);"></div>
        </div>

        <!-- Confirm Password -->
        <div class="mb-4">
          <label for="confirmPassword" class="form-label field-label">Confirmar contraseña</label>
          <div class="input-wrap" style="position:relative;">
            <input id="confirmPassword" type="password" class="form-control custom-input"
                   placeholder="Repite tu contraseña" autocomplete="new-password"
                   style="padding-right: 46px;" />
            <button type="button" class="rp-toggle-eye" id="toggleConfirm" title="Mostrar contraseña">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:18px;height:18px;">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <div id="matchHint" style="font-size:0.72rem; margin-top:5px; font-weight:600;"></div>
        </div>

        <button type="submit" class="btn btn-submit w-100" id="submitBtn"
                ${this.loading ? "disabled" : ""}>
          ${this.loading
            ? `<span class="login-spinner"></span>`
            : "Establecer nueva contraseña"}
        </button>

        <div class="text-center mt-3">
          <a href="#" id="backToLogin" class="forgot-link">← Volver al inicio de sesión</a>
        </div>
      </form>
    `;
  }

  _renderSuccess() {
    return `
      <div class="text-center py-3">
        <div style="
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(90, 204, 164, 0.12); border: 2px solid rgba(90, 204, 164, 0.4);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
        ">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--mint, #5acca4)" stroke-width="2.5"
               style="width:32px;height:32px;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>

        <h2 class="form-title mb-2">¡Contraseña actualizada!</h2>
        <p class="form-subtitle mb-4">
          Tu contraseña fue cambiada exitosamente. Por seguridad, todas tus sesiones activas han sido cerradas.
        </p>

        <button id="goToLogin" class="btn btn-submit w-100">
          Iniciar sesión
        </button>
      </div>
    `;
  }

  _renderInvalid() {
    return `
      <div class="text-center py-3">
        <div style="
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(254, 101, 79, 0.10); border: 2px solid rgba(254, 101, 79, 0.35);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
        ">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--coral, #fe654f)" stroke-width="2.5"
               style="width:32px;height:32px;">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>

        <h2 class="form-title mb-2">Enlace inválido</h2>
        <p class="form-subtitle mb-4">
          Este enlace de recuperación es inválido o ya expiró. Por favor solicita uno nuevo.
        </p>

        <a href="#" id="requestNew" class="btn btn-submit w-100" style="text-decoration:none; display:flex; align-items:center; justify-content:center;">
          Solicitar nuevo enlace
        </a>
      </div>
    `;
  }

  _getStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0-5
  }

  _attachHandlers() {
    const newPwd  = document.getElementById("newPassword");
    const confPwd = document.getElementById("confirmPassword");
    const strengthBar   = document.getElementById("strengthBar");
    const strengthLabel = document.getElementById("strengthLabel");
    const matchHint     = document.getElementById("matchHint");

    // Password visibility toggles
    document.getElementById("toggleNew")?.addEventListener("click", () => {
      newPwd.type = newPwd.type === "password" ? "text" : "password";
    });
    document.getElementById("toggleConfirm")?.addEventListener("click", () => {
      confPwd.type = confPwd.type === "password" ? "text" : "password";
    });

    // Strength meter
    newPwd?.addEventListener("input", () => {
      const score = this._getStrength(newPwd.value);
      const pct   = (score / 5) * 100;
      const map   = [
        { color: "#e2e8f0", label: "" },
        { color: "#fe654f", label: "Muy débil" },
        { color: "#f59e0b", label: "Débil" },
        { color: "#e6ca52", label: "Aceptable" },
        { color: "#5acca4", label: "Fuerte" },
        { color: "#10b981", label: "Muy fuerte" },
      ];
      const tier = map[score] || map[0];
      strengthBar.style.width   = `${pct}%`;
      strengthBar.style.background = tier.color;
      strengthLabel.textContent = tier.label;
      strengthLabel.style.color = tier.color;
    });

    // Match hint
    const checkMatch = () => {
      if (!confPwd.value) { matchHint.textContent = ""; return; }
      if (newPwd.value === confPwd.value) {
        matchHint.textContent = "✓ Las contraseñas coinciden";
        matchHint.style.color = "var(--mint, #5acca4)";
      } else {
        matchHint.textContent = "✗ Las contraseñas no coinciden";
        matchHint.style.color = "var(--coral, #fe654f)";
      }
    };
    newPwd?.addEventListener("input", checkMatch);
    confPwd?.addEventListener("input", checkMatch);

    // Form submit
    document.getElementById("resetForm")?.addEventListener("submit", (e) => this._handleSubmit(e));

    // Back to login
    document.getElementById("backToLogin")?.addEventListener("click", (e) => {
      e.preventDefault();
      window.history.replaceState({}, "", "/");
      this.router.navigate("login");
    });

    // Post-success button
    document.getElementById("goToLogin")?.addEventListener("click", () => {
      window.history.replaceState({}, "", "/");
      this.router.navigate("login");
    });

    // Invalid state — request new
    document.getElementById("requestNew")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.router.navigate("forgotPassword");
    });
  }

  async _handleSubmit(e) {
    e.preventDefault();

    const newPwd  = document.getElementById("newPassword")?.value ?? "";
    const confPwd = document.getElementById("confirmPassword")?.value ?? "";

    if (!newPwd || !confPwd) {
      toast.warning("Campos requeridos", "Por favor completa ambos campos.");
      return;
    }
    if (newPwd.length < 6) {
      toast.warning("Contraseña corta", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPwd !== confPwd) {
      toast.error("No coinciden", "Las contraseñas no coinciden. Verifica e intenta de nuevo.");
      return;
    }

    this.loading = true;
    this.render();

    try {
      await resetPassword(this.token, newPwd);
      this.done = true;
      this.loading = false;
      this.render();

      // Wire success button after re-render
      document.getElementById("goToLogin")?.addEventListener("click", () => {
        window.history.replaceState({}, "", "/");
        this.router.navigate("login");
      });
    } catch (err) {
      this.loading = false;
      const msg = err?.response?.data?.message || err?.message || "Ocurrió un error. Intenta de nuevo.";
      toast.error("Error", msg);
      this.render();
    }
  }

  destroy() {}
}
