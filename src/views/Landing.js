localStorage.clear();
sessionStorage.clear();

import { icons } from "../utils/icons.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/navbar.css"
import "../assets/styles/landing.css";

export default class Landing {
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
    <div class="container-fluid p-0 d-flex flex-column">
      <nav class="site-nav px-5">
      <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center py-3">

          <a class="nav-brand text-decoration-none d-flex g-5" href="#">
            <span class='sidebar-brand-icon'> ${icons.teamUp()} </span> TeamUp</a>

          <div class="d-none d-md-flex align-items-center gap-4">
            <a class="nav-link-custom text-decoration-none" href="#features">Features</a>
            <a class="nav-link-custom text-decoration-none" href="#how-it-works">How it works</a>
            <a class="nav-link-custom text-decoration-none" href="#tech-stack">Tech Stack</a>
          </div>

          <button class="btn-primary-pill login-redirection">Get Started</button>
        </div>
      </div>
    </nav>

    <main>
      <div class="container-xl px-3 px-md-4">

        <!-- ── HERO ── -->
        <section class="hero-section">
          <div class="row g-5 align-items-center">

            <!-- Copy -->
            <div class="col-12 col-xl-5">
              <h1 class="hero-heading mb-4">
                Run your <span class="accent">hackathon</span>. Not your spreadsheets.
              </h1>
              <p class="hero-sub mb-5">
                The ultimate operating system for modern hackathons. Manage teams,
                automate GitHub, and rank projects with AI precision.
              </p>
              <div class="d-flex flex-wrap gap-3">
                <button class="btn-hero-primary login-redirection">
                  Start Organizing
                  <span class="material-symbols-outlined">rocket_launch</span>
                </button>
                <button class="btn-hero-ghost">View Demo</button>
              </div>
            </div>

            <!-- Stat cards -->
            <div class="col-12 col-xl-7">
              <div class="hero-img-wrap">
                <div class="row g-3">

                  <!-- Card 1 — full width -->
                  <div class="col-12">
                    <div class="stat-card stat-card--accent">
                      <div class="d-flex justify-content-between align-items-start">
                        <div class="icon-bubble">
                          <span class="material-symbols-outlined">groups</span>
                        </div>
                        <span class="stat-label-top">Active Now</span>
                      </div>
                      <div>
                        <div class="stat-number">2,450+</div>
                        <div class="stat-desc">Builders looking for teams</div>
                      </div>
                    </div>
                  </div>

                  <!-- Card 2 — left -->
                  <div class="col-6">
                    <div class="stat-card stat-card--mint">
                      <div class="icon-bubble">
                        <span class="material-symbols-outlined">trophy</span>
                      </div>
                      <div>
                        <div class="stat-number stat-number--sm">$1.2M</div>
                        <div class="stat-desc">Prizes Won</div>
                      </div>
                    </div>
                  </div>

                  <!-- Card 3 — right -->
                  <div class="col-6">
                    <div class="stat-card stat-card--surface">
                      <div class="icon-bubble icon-bubble--dim">
                        <span class="material-symbols-outlined">rocket_launch</span>
                      </div>
                      <div>
                        <div class="stat-number stat-number--sm">150+</div>
                        <div class="stat-desc">Live Hackathons</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </section>


        <!-- ── FEATURES BENTO ── -->
        <section class="features-section" id="features">

          <div class="text-center mb-5">
            <h2 class="section-eyebrow mb-3">Powerful Hackathon Engine</h2>
            <p class="section-sub">
              Everything you need to go from "Idea" to "Final Ranking" without
              touching a single Excel row.
            </p>
          </div>

          <!-- Row 1 -->
          <div class="row g-4 mb-4">

            <!-- Team Management -->
            <div class="col-12 col-md-7">
              <div class="bento-card bento-accent">
                <div class="bento-icon">
                  <span class="material-symbols-outlined icon-md">groups</span>
                </div>
                <h3 class="fw-bold fs-3 mb-3">Team Management</h3>
                <p class="bento-body mb-0">
                  Dynamic team formation, role assignments, and real-time
                  collaboration tools for organizers.
                </p>
                <div class="glow-orb"></div>
              </div>
            </div>

            <!-- GitHub Automation -->
            <div class="col-12 col-md-5">
              <div class="bento-card bento-mint d-flex flex-column justify-content-between">
                <div>
                  <div class="bento-icon">
                    <span class="material-symbols-outlined icon-md">terminal</span>
                  </div>
                  <h3 class="fw-bold fs-4 mb-3">GitHub Automation</h3>
                  <p class="mb-0">
                    Automatic repo creation, CI/CD setup, and contributor tracking
                    for every team.
                  </p>
                </div>
                <div class="divider-mint d-flex gap-2 flex-wrap">
                  <span class="pill-tag pill-tag--mint">Auto-PR</span>
                  <span class="pill-tag pill-tag--mint">Webhooks</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 2 -->
          <div class="row g-4">

            <!-- Rubric Evaluations -->
            <div class="col-12 col-md-4">
              <div class="bento-card bento-plain">
                <div class="bento-icon">
                  <span class="material-symbols-outlined icon-lg" style="color:var(--coral);">fact_check</span>
                </div>
                <h3 class="fw-bold fs-5 mb-2">Rubric Evaluations</h3>
                <p class="mb-0">
                  Customizable scoring criteria with weighted averages for fair judging.
                </p>
              </div>
            </div>

            <!-- QR Public Voting -->
            <div class="col-12 col-md-4">
              <div class="bento-card bento-lilac">
                <div class="bento-icon">
                  <span class="material-symbols-outlined icon-md" style="color:var(--navy);">qr_code_2</span>
                </div>
                <h3 class="fw-bold fs-5 mb-2">QR Public Voting</h3>
                <p class="mb-0">
                  Engage the audience with real-time voting via unique QR codes
                  for every project.
                </p>
              </div>
            </div>

            <!-- AI Ranking -->
            <div class="col-12 col-md-4">
              <div class="bento-card bento-gold d-flex flex-column align-items-center justify-content-center text-center">
                <span class="material-symbols-outlined icon-star mb-3">auto_awesome</span>
                <h3 class="fw-bold fs-5 mb-2">Automatic Ranking</h3>
                <p class="mb-0">
                  Instant leaderboard generation powered by AI-assisted sentiment
                  and score analysis.
                </p>
              </div>
            </div>

          </div>
        </section>


        <!-- ── HOW IT WORKS ── -->
        <section class="how-section" id="how-it-works">
          <div class="row g-5 align-items-center">

            <div class="col-12 col-lg-6">
              <h2 class="how-heading mb-5">Seamless Workflow</h2>

              <div class="d-flex flex-column gap-5">

                <div class="d-flex gap-4">
                  <div class="step-circle c-accent">1</div>
                  <div>
                    <div class="step-title mb-1">Create Event</div>
                    <p class="step-desc mb-0">
                      Set your dates, rubrics, and GitHub organization in minutes.
                    </p>
                  </div>
                </div>

                <div class="d-flex gap-4">
                  <div class="step-circle c-mint">2</div>
                  <div>
                    <div class="step-title mb-1">Teams Register</div>
                    <p class="step-desc mb-0">
                      Participants invite teammates, link GitHub profiles, and receive
                      auto-provisioned developer environments.
                    </p>
                  </div>
                </div>

                <div class="d-flex gap-4">
                  <div class="step-circle c-lilac">3</div>
                  <div>
                    <div class="step-title mb-1">Evaluate &amp; Vote</div>
                    <p class="step-desc mb-0">
                      Judges use real-time rubrics while the audience votes.
                      Rankings are calculated live for the closing ceremony.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div class="col-12 col-lg-6">
              <div class="how-img-wrap">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBpBaDBArWtbwg9HUTeUmUmlc9FwjI3uwU1C1VxbGGlwQbRj-qcM6xBkSTqrpGwvXiH84xkA_k1lPGaHvroEzOPLyieiD3pIoaTtP2MpRNcIQNQXuvLXy9bvI2XwyMOGEg4FPNN5oDxX_OG_c3hsM_DJOd392QLdDktYLOgA7DILe-NYkkhR_EjNSLdy9TIiGPq5YYK8xqPYteINbkwPoPIfhCN9k6zPJf2j8rSyrwL6M-r5UT8UrD8DGGRKHiHR4XuknORi4Vjzog"
                  alt="Collaborative Environment"
                />
              </div>
            </div>

          </div>
        </section>


        <!-- ── TECH STACK ── -->
        <section class="tech-section text-center" id="tech-stack">
          <h3 class="section-label fw-bold mb-5">Built with Modern Standards</h3>
          <div class="d-flex flex-wrap justify-content-center gap-3">
            <span class="tech-pill"><span class="dot dot--js"></span>Vanilla JS</span>
            <span class="tech-pill"><span class="dot dot--vite"></span>Vite</span>
            <span class="tech-pill"><span class="dot dot--node"></span>Node.js</span>
            <span class="tech-pill"><span class="dot dot--bootstrap"></span>Bootsrap</span>
            <span class="tech-pill"><span class="dot dot--postgres"></span>PostgreSQL</span>
          </div>
        </section>


        <!-- ── FINAL CTA ── -->
        <section class="cta-section">
          <div class="cta-card">
            <div class="cta-orb cta-orb-tl"></div>
            <div class="cta-orb cta-orb-br"></div>
            <div class="cta-inner">
              <h2 class="mb-4">Ready to scale your next Innovation Challenge  ?</h2>
              <p class="mb-5">
                Join hundreds of organizers who are reclaiming their time and
                delighting participants with TeamUp.
              </p>
              <button class="btn-cta">Launch Your Event</button>
            </div>
          </div>
        </section>

      </div><!-- /container-xl -->
    </main>


    <!-- =============================================
        FOOTER
    ============================================= -->
    <footer class="site-footer">
      <div class="container-xl px-3 px-md-4">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">

          <div class="text-center text-md-start">
            <div class="footer-brand mb-1">TeamUp</div>
            <p class="footer-tagline mb-0">Built at RIWI · Colombia 🇨🇴</p>
          </div>

          <div class="d-flex gap-4">
            <a href="#" class="footer-link">Privacy</a>
            <a href="#" class="footer-link">Terms</a>
            <a href="#" class="footer-link">GitHub</a>
          </div>

          <div class="d-flex gap-3">
            <span class="material-symbols-outlined footer-icon">language</span>
            <span class="material-symbols-outlined footer-icon">share</span>
          </div>

        </div>
      </div>
    </footer>
    </div>
    `;

    this.attachEventHandlers();
    this._offLangChange = onLangChange(() => this.render());
  }

  attachEventHandlers() {

    const loginedirection = document.querySelectorAll(".login-redirection");

    loginedirection?.forEach((e) => {
      e.addEventListener("click", () => {
        this.router.navigate("login")
      });
    });
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
