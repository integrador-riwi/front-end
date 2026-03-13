import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { t } from "../utils/i18n.js";
import "../assets/styles/components.css";

export default class NotFoundView {
  constructor(router) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.header = new Header(router);
  }

  render() {
    const app = document.getElementById("app");
    
    app.innerHTML = `
      <div class="d-flex h-100 bg-light">
        ${this.navbar.render()}
        <div class="flex-fill d-flex flex-column">
          ${this.header.render()}
          <main class="flex-fill d-flex align-items-center justify-content-center p-4">
            <div class="text-center" style="max-width: 600px;">
              <!-- 404 Backdrop -->
              <div class="position-relative mb-5">
                <h1 class="display-1 fw-bold mb-0 position-absolute top-50 start-50 translate-middle" 
                    style="color: var(--accent); opacity: 0.08; font-size: 12rem; z-index: 0; pointer-events: none; letter-spacing: -5px;">
                  404
                </h1>
                
                <div class="position-relative" style="z-index: 1;">
                  <h2 class="fw-bold mb-3 display-5" style="color: var(--text-primary);">${t('notFound.title')}</h2>
                  <p class="text-muted fs-5 mb-0 px-4">
                    ${t('notFound.subtitle')}
                  </p>
                </div>
              </div>
              
              <div class="card-custom p-4 mb-5 mx-auto" style="border: 1px dashed var(--border-card); background: var(--accent-dim); border-radius: 20px; max-width: 450px;">
                <p class="small text-muted mb-0">
                  <i class="bi bi-info-circle me-2"></i>
                  ${t('notFound.lostMsg')}
                </p>
              </div>

              <div class="d-flex justify-content-center gap-3">
                <button id="go-home-btn" class="app-btn-primary px-5 py-3 d-flex align-items-center">
                  <i class="bi bi-house-door-fill me-2 fs-5"></i> 
                  <span>${t('notFound.backHome')}</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;

    this.navbar.attachEventHandlers();
    this.attachEventListeners();
  }

  attachEventListeners() {
    const homeBtn = document.getElementById("go-home-btn");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        this.router.init(); // This re-evaluates the role-based home
      });
    }
  }
}
