import { forgotPassword } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import "../assets/styles/login.css";

/**
 * ForgotPasswordView
 * Public page — the user enters their email to request a reset link.
 * Deliberately generic feedback to prevent user enumeration.
 */
export default class ForgotPasswordView {
  constructor(router) {
    this.router = router;
    this.loading = false;
    this.sent = false;
  }

  render() {
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
              Te enviaremos un enlace seguro para que puedas restablecer tu contraseña en menos de un minuto.
            </p>
            <div class="left-tags d-flex flex-wrap justify-content-center gap-2 mt-4">
              <span class="tag tag-lilac">Seguro</span>
              <span class="tag tag-mint">Privado</span>
              <span class="tag tag-gold">Simple</span>
            </div>
          </div>
        </section>

        <!-- RIGHT PANEL -->
        <section class="login-right d-flex align-items-center justify-content-center">
          <div class="form-card w-100">

            <!-- Mobile title -->
            <div class="d-flex d-md-none justify-content-center mb-2">
              <span class="mobile-app-name">TeamUp</span>
            </div>

            ${this.sent ? this._renderSuccess() : this._renderForm()}

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

    if (!this.sent) this._attachHandlers();
  }

  _renderForm() {
    return `
      <header class="form-header mb-4">
        <p class="form-eyebrow">Recuperación de acceso</p>
        <h2 class="form-title">¿Olvidaste tu contraseña?</h2>
        <p class="form-subtitle">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>
      </header>

      <form id="forgotForm" novalidate>
        <div class="mb-4">
          <label for="email" class="form-label field-label">Correo electrónico</label>
          <div class="input-wrap">
            <input id="email" type="email" class="form-control custom-input"
                   placeholder="name@correo.com" autocomplete="email" required />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
        </div>

        <button type="submit" class="btn btn-submit w-100 mt-1" id="submitBtn"
                ${this.loading ? "disabled" : ""}>
          ${this.loading
            ? `<span class="login-spinner"></span>`
            : "Enviar enlace de recuperación"}
        </button>

        <div class="text-center mt-3">
          <a href="#" id="backToLogin" class="forgot-link">
            ← Volver al inicio de sesión
          </a>
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

        <h2 class="form-title mb-2">Revisa tu correo</h2>
        <p class="form-subtitle mb-4">
          Si existe una cuenta con ese correo, recibirás un enlace de recuperación en los próximos minutos.
          El enlace expira en <strong>15 minutos</strong>.
        </p>

        <div style="
          background: rgba(107,92,255,0.07); border: 1px solid rgba(107,92,255,0.2);
          border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; text-align: left;
        ">
          <p style="margin:0; font-size:0.82rem; color: var(--text-muted); line-height:1.6;">
            💡 <strong>Tip:</strong> Revisa también tu carpeta de spam o correo no deseado.
          </p>
        </div>

        <a href="#" id="backToLogin" class="btn btn-submit w-100" style="text-decoration:none; display:flex; align-items:center; justify-content:center;">
          Volver al inicio de sesión
        </a>
      </div>
    `;
  }

  _attachHandlers() {
    const form = document.getElementById("forgotForm");
    form?.addEventListener("submit", (e) => this._handleSubmit(e));

    document.getElementById("backToLogin")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.router.navigate("login");
    });
  }

  async _handleSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("email")?.value?.trim();

    if (!email) {
      toast.warning("Campo requerido", "Por favor ingresa tu correo electrónico.");
      return;
    }

    this.loading = true;
    this.render();

    try {
      await forgotPassword(email);
      this.sent = true;
      this.loading = false;
      this.render();
    } catch (err) {
      // Even on error, show success to prevent enumeration
      this.sent = true;
      this.loading = false;
      this.render();
    }
  }

  destroy() {}
}
