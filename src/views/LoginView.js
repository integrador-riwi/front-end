import { saveSession }  from "../utils/auth.js";
import { renderErrorBox }         from "../utils/helpers.js";
import "../assets/styles/login.css";

export default class LoginView {
  constructor(router) {
    this.router = router;
    this.email    = "";
    this.password = "";
    this.error    = "";
    this.loading  = false;
  }

  render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <main class="login-shell">

        <section class="login-left">
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
          <div class="blob blob-3"></div>
          <div class="left-content">
            <h1 class="left-title">TeamUp</h1>
            <p class="left-desc">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit,
              sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <div class="left-tags">
              <span class="tag tag-lilac">Collaborate</span>
              <span class="tag tag-mint">Track Progress</span>
              <span class="tag tag-gold">Grow Together</span>
            </div>
          </div>
        </section>

        <section class="login-right">
          <div class="form-card">

            <header class="form-header">
              <p class="form-eyebrow">Welcome back</p>
              <h2 class="form-title">Sign in to your<br/>account</h2>
              <p class="form-subtitle">Enter your credentials to continue.</p>
            </header>

            ${renderErrorBox(this.error)}

            <form id="loginForm">
              <div class="field">
                <label for="email">Email Address</label>
                <div class="input-wrap">
                  <input id="email" type="email" placeholder="name@correo.com"
                         autocomplete="email" required value="${this.email}" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
              </div>

              <div class="field">
                <div class="field-row">
                  <label for="password">Password</label>
                  <a href="#" class="forgot-link">Forgot password?</a>
                </div>
                <div class="input-wrap">
                  <input id="password" type="password" placeholder="••••••••"
                         autocomplete="current-password" required />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>

              <button type="submit" class="btn-submit" id="submitBtn"
                      ${this.loading ? "disabled" : ""}>
                ${this.loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div class="accent-bar">
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
  }

  attachEventHandlers() {
    const form          = document.getElementById("loginForm");
    const emailInput    = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    emailInput.addEventListener("input",    (e) => { this.email    = e.target.value; });
    passwordInput.addEventListener("input", (e) => { this.password = e.target.value; });
    form.addEventListener("submit",         (e) => this.handleLogin(e));
  }

  async handleLogin(e) {
    e.preventDefault();
    this.loading = true;
    this.error   = "";
    this.render();

    try {
      const { token, user } = await loginUser(this.email, this.password);
      saveSession(token, user)
      this.router.navigate("dashboard");
    } catch (err) {
      this.error   = err.response?.data?.message || "Login failed. Try again.";
      this.loading = false;
      this.render();
    }
  }
}