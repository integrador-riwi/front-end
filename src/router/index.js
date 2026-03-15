import "../assets/styles/main.css";
import "../components/Toast/index.js";
import LoginView from "../views/LoginView.js";
import DashboardView from "../views/DashboardView.js";
import { isAuthenticated } from "../utils/auth.js";
import { initSocket } from "../services/socket.js";
import CreateEvent from "../views/createEvent.js";
import EventDetails from "../views/eventDetails.js";
import Teams from "../views/TeamsAndProjects.js";
import Ranking from "../views/Ranking.js";
import coderHome from "../views/coderHome.js";
import CoderEventSelect from "../views/codereventselect.js";
import ProjectSettings from "../views/ProjectSettings.js";
import EventsView from "../views/EventsView.js";
import ProfileView from "../views/ProfileView.js";
import TLDashboardView from "../views/TLDashboardView.js";
import TeamDetailView from "../views/TeamDetailView.js"; // ← NUEVO
import { getMyTeams } from "../services/api.js";
import { getCurrentUser } from "../utils/helpers.js";
import PublicVotingPage from "../views/PublicVotingPage.js";
import FinalistsView from "../views/Finalists.js";
import {
  i18nReady,
  t,
  toggleLang,
  onLangChange,
  getLang,
} from "../utils/i18n.js";

await i18nReady;

// ── Floating language toggle (always visible, all views) ──────────────────────
function mountLangToggle() {
  const existing = document.getElementById("floatingLangBtn");
  if (existing) existing.remove();

  const btn = document.createElement("button");
  btn.id = "floatingLangBtn";
  btn.textContent = t("nav.langToggle");
  btn.title = t("nav.langLabel");
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    background: var(--color-primary, #6b5cff);
    color: #fff;
    border: none;
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    transition: opacity 0.2s;
  `;
  btn.addEventListener("mouseenter", () => {
    if (!btn.disabled) btn.style.opacity = "0.85";
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.opacity = "1";
  });
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    try {
      await toggleLang();
    } finally {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  });
  document.body.appendChild(btn);
}

mountLangToggle();
// Update only the button label on lang change — no full re-mount needed
onLangChange(() => {
  const btn = document.getElementById("floatingLangBtn");
  if (btn) {
    btn.textContent = t("nav.langToggle");
    btn.title = t("nav.langLabel");
  } else {
    mountLangToggle();
  }
});

if (isAuthenticated()) {
  initSocket();
}

import QRVoting from "../views/EventVoting.js";
import NotFoundView from "../views/NotFoundView.js";

const ROUTE_PERMISSIONS = {
  login: "PUBLIC",
  dashboard: ["ADMIN", "STAFF"],
  events: ["ADMIN", "STAFF"],
  "events/create": ["ADMIN"],
  details: ["ADMIN", "STAFF"],
  projects: ["ADMIN", "STAFF", "CODER"],
  teamDetail: ["ADMIN"], // ← NUEVO
  ranking: ["ADMIN", "STAFF"],
  qr: ["ADMIN"],
  coderEventSelect: [
    "CODER",
    "TL_DEVELOPMENT",
    "TL_SOFT_SKILLS",
    "TL_ENGLISH",
    "ADMIN",
  ],
  coderHome: ["CODER", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"],
  projectSettings: ["CODER", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"],
  profile: [
    "ADMIN",
    "STAFF",
    "CODER",
    "TL_DEVELOPMENT",
    "TL_SOFT_SKILLS",
    "TL_ENGLISH",
  ],
  tlDashboard: ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "ADMIN"],
  vote: "PUBLIC",
  finalists: ["ADMIN", "STAFF"],
};

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.user = null;
    this.hasTeam = false;
    this.currentParams = {};
    this._langUnsubscribe = null;

    // Re-render the current view whenever the language changes.
    // Guard: register only once and skip auth checks on lang-triggered re-renders.
    this._langUnsubscribe = onLangChange(() => {
      if (this.currentRoute) {
        this._renderView(this.currentRoute, this.currentParams);
      }
    });

    this.init();
  }

  getHomeRoute() {
    const user = getCurrentUser();
    if (!user) return "login";

    switch (user.role) {
      case "ADMIN":
        return "events";
      case "STAFF":
        return "dashboard";
      case "CODER":
      case "TL_DEVELOPMENT":
      case "TL_SOFT_SKILLS":
      case "TL_ENGLISH":
        return "coderEventSelect";
      default:
        return "login";
    }
  }

  init() {
    const path = window.location.pathname;

    // Detect QR public voting route
    if (path.startsWith("/vote/")) {
      const eventId = path.split("/")[2];
      this.navigate("vote", { eventId });
      return;
    }

    const user = getCurrentUser();
    this.user = user;

    const params = new URLSearchParams(window.location.search);
    const githubSuccess = params.get("github");
    const githubError = params.get("error");

    if (githubSuccess === "success" || githubError) {
      window.history.replaceState({}, "", "/");

      if (!isAuthenticated()) {
        this.navigate("login");
        return;
      }

      this.navigate("profile", {
        githubSuccess: githubSuccess === "success",
        githubUsername: params.get("username"),
        githubError: githubError,
      });

      return;
    }

    if (!isAuthenticated()) {
      this.navigate("login");
      return;
    }

    this.navigate(this.getHomeRoute());
  }

  async checkUserTeam() {
    try {
      console.log("CHECK TEAM CALLED");
      const response = await getMyTeams();
      console.log("MY TEAMS:", response);
      const teams = response?.teams || [];

      return teams.length > 0;
    } catch (error) {
      console.log("User has no team");

      return false;
    }
  }

  getAppState() {
    return {
      user: this.user,
      hasTeam: this.hasTeam,
    };
  }

  // Internal render without auth checks — used for language-triggered re-renders
  _renderView(route, params = {}) {
    if (this.currentView && typeof this.currentView.destroy === "function") {
      this.currentView.destroy();
    }
    this.currentView = null;
    this.app.innerHTML = "";
    this.currentRoute = route;
    this.currentParams = params;
    this._mountView(route, params);
  }

  navigate(route, params = {}) {
    // Enforcement layer
    const isAuth = isAuthenticated();
    const user = getCurrentUser();
    const permission = ROUTE_PERMISSIONS[route];

    // 1. Check if route exists in permissions
    if (!permission && route !== "not-found") {
      this.navigate("not-found");
      return;
    }

    // 2. Handle Public vs Private
    if (permission === "PUBLIC") {
      if (isAuth && route === "login") {
        this.navigate(this.getHomeRoute());
        return;
      }
    } else {
      if (!isAuth) {
        this.navigate("login");
        return;
      }

      // 3. Role-based check
      if (Array.isArray(permission) && !permission.includes(user?.role)) {
        console.warn(`Access denied for ${user?.role} to ${route}`);
        this.navigate(this.getHomeRoute());
        return;
      }
    }

    this._renderView(route, params);
  }

  _mountView(route, params = {}) {
    switch (route) {
      case "login":
        this.currentView = new LoginView(this);
        break;

      case "dashboard":
        this.currentView = new DashboardView(this, params);
        break;

      case "events":
        this.currentView = new EventsView(this);
        break;

      case "events/create":
        this.currentView = new CreateEvent(this);
        break;

      case "details":
        this.currentView = new EventDetails(this, params);
        break;

      case "projects":
        this.currentView = new Teams(this);
        break;

      case "teamDetail":
        this.currentView = new TeamDetailView(this, params);
        break;

      case "ranking":
        this.currentView = new Ranking(this);
        break;

      case "qr":
        this.currentView = new QRVoting(this);
        break;

      case "coderEventSelect":
        this.currentView = new CoderEventSelect(this);
        this.currentView.init();
        return;

      case "coderHome":
        this.currentView = new coderHome(this);
        this.currentView.init();
        return;

      case "projectSettings":
        this.currentView = new ProjectSettings(this, params);
        break;

      case "profile":
        this.currentView = new ProfileView(this);
        break;

      case "tlDashboard":
        this.currentView = new TLDashboardView(this);
        this.currentView.init();
        return;

      case "vote":
        this.currentView = new PublicVotingPage(this, params);
        this.currentView.render(this.app);
        return;
      case "finalists":
        this.currentView = new FinalistsView(this);
        break;

      default:
        this.currentView = new NotFoundView(this);
        break;
    }

    if (!this.currentView) {
      console.error("No view created for route:", route);
      return;
    }

    this.currentView.render();
  }
}

new App();
