import "../assets/styles/main.css";
import "../components/Toast/index.js";
import LoginView from "../views/LoginView.js";
import ForgotPasswordView from "../views/ForgotPasswordView.js";
import ResetPasswordView from "../views/ResetPasswordView.js";
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
import BrowseProjects from "../views/BrowseProjects.js";
import PublicProfileView from "../views/PublicProfileView.js";
import TeamDetailView from "../views/TeamDetailView.js"; // ← NUEVO
import UsersAdminView from "../views/UsersAdminView.js";
import GradesAuditView from "../views/GradesAuditView.js";
import { getMyTeams } from "../services/api.js";
import { getCurrentUser } from "../utils/helpers.js";
import PublicVotingPage from "../views/PublicVotingPage.js";
import FinalistsView from "../views/Finalists.js";
import Landing from "../views/Landing.js";
import {
  i18nReady,
  t,
  onLangChange,
} from "../utils/i18n.js";

await i18nReady;



if (isAuthenticated()) {
  initSocket();
}

import QRVoting from "../views/EventVoting.js";
import NotFoundView from "../views/NotFoundView.js";

const ROUTE_PERMISSIONS = {
  landing: "PUBLIC",
  login: "PUBLIC",
  dashboard: ["ADMIN", "STAFF"],
  events: ["ADMIN", "STAFF"],
  "events/create": ["ADMIN"],
  "events/edit": ["ADMIN"],
  details: ["ADMIN", "STAFF"],
  projects: ["ADMIN", "STAFF"],
  browseProjects: ["CODER"],
  teamDetail: [
    "ADMIN",
    "CODER",
    "TL_DEVELOPMENT",
    "TL_SOFT_SKILLS",
    "TL_ENGLISH",
  ],
  ranking: ["ADMIN", "STAFF"],
  gradesAudit: ["ADMIN"],
  users: ["ADMIN"],
  qr: ["ADMIN"],
  coderEventSelect: [
    "CODER",
    "TL_DEVELOPMENT",
    "TL_SOFT_SKILLS",
    "TL_ENGLISH",
    "ADMIN",
  ],
  coderHome: ["CODER"],
  projectSettings: ["CODER"],
  profile: [
    "ADMIN",
    "STAFF",
    "CODER",
    "TL_DEVELOPMENT",
    "TL_SOFT_SKILLS",
    "TL_ENGLISH",
  ],
  tlDashboard: ["TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "ADMIN"],
  publicProfile: [
    "ADMIN",
    "STAFF",
    "CODER",
    "TL_DEVELOPMENT",
    "TL_SOFT_SKILLS",
    "TL_ENGLISH",
  ],
  vote: "PUBLIC",
  staffVote: "PUBLIC",
  finalists: ["ADMIN", "STAFF"],
  forgotPassword: "PUBLIC",
  resetPassword:  "PUBLIC",
};

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.user = null;
    this.hasTeam = false;
    this.currentParams = {};
    this.historyStack = [];
    this._langUnsubscribe = null;

    // Re-render the current view whenever the language changes.
    // Guard: register only once and skip auth checks on lang-triggered re-renders.
    this._langUnsubscribe = onLangChange(() => {
      if (this.currentRoute) {
        this._renderView(this.currentRoute, this.currentParams);
      }
    });

    // Delegated click handler for user profile links across the app
    document.addEventListener("click", (e) => {
      const memberItem = e.target.closest(".ct-member-clickable");
      if (memberItem) {
        const userId = memberItem.dataset.userId;
        if (userId) {
          this.navigate("publicProfile", { userId });
        }
      }
    });

    this.init();
  }

  getHomeRoute() {
    const user = getCurrentUser();
    if (!user) return "landing";

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

  async init() {
    const path = window.location.pathname;

    // Detect QR public voting route
    if (path.startsWith("/vote/")) {
      const eventId = path.split("/")[2];
      this.navigate("vote", { eventId });
      return;
    }

    // Detect staff private voting route
    if (path.startsWith("/staff-vote/")) {
      const staffToken = path.split("/")[2];
      this.navigate("staffVote", { staffToken });
      return;
    }

    if (path.startsWith("/profile/")) {
      const userId = path.split("/")[2];
      this.navigate("publicProfile", { userId });
      return;
    }

    // Detect password-reset link from email
    if (path === "/reset-password" || path.startsWith("/reset-password")) {
      this.navigate("resetPassword");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const githubSuccess = params.get("github");
    const githubError = params.get("error");

    if (githubSuccess === "success" || githubError) {
      window.history.replaceState({}, "", "/");

      try {
        const { getMe } = await import("../services/api.js");
        const me = await getMe();
        const user = me?.data ?? me;
        if (user) {
          const { saveUser } = await import("../utils/auth.js");
          saveUser(user);
          this.user = user;
        }
      } catch {
        this.navigate("landing");
        return;
      }

      this.navigate("profile", {
        githubSuccess: githubSuccess === "success",
        githubUsername: params.get("username"),
        githubError: githubError,
      });

      return;
    }

    // Verificar si existe sesión válida en cookies HttpOnly o access token en memoria.
    try {
      const { getMe } = await import("../services/api.js");
      const me = await getMe();
      const user = me?.data ?? me;
      if (user) {
        const { saveUser } = await import("../utils/auth.js");
        saveUser(user);
        this.user = user;
      }

      // Intentar restaurar la última ruta visitada (persistida en sessionStorage)
      const savedRoute = sessionStorage.getItem("lastRoute");
      if (savedRoute) {
        try {
          const { route, params } = JSON.parse(savedRoute);
          // Verificar que el rol del usuario tiene acceso a esa ruta
          const permission = ROUTE_PERMISSIONS[route];
          const userRole = (me?.data ?? me)?.role;
          if (permission && (permission === "PUBLIC" || (Array.isArray(permission) && permission.includes(userRole)))) {
            this.navigate(route, params || {});
            return;
          }
        } catch {
          // Si hay error parseando, ignorar y usar home por defecto
        }
      }

      this.navigate(this.getHomeRoute());
    } catch (err) {
      this.navigate("landing");
    }
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

    if (this.currentRoute) {
      this.historyStack.push({ route: this.currentRoute, params: this.currentParams });
    }

    // Persistir la ruta actual para restaurarla si el usuario recarga
    // Solo guardar rutas privadas (no landing/login/vote/staffVote)
    const publicRoutes = ["landing", "login", "vote", "staffVote", "not-found"];
    if (!publicRoutes.includes(route)) {
      sessionStorage.setItem("lastRoute", JSON.stringify({ route, params }));
    }

    this._renderView(route, params);
  }

  back(fallbackRoute = null) {
    if (this.historyStack.length > 0) {
      const prev = this.historyStack.pop();
      this._renderView(prev.route, prev.params);
    } else {
      this.navigate(fallbackRoute || this.getHomeRoute());
    }
  }
  _mountView(route, params = {}) {
    switch (route) {
      case "landing":
        this.currentView = new Landing(this);
        break;

      case "login":
        this.currentView = new LoginView(this);
        break;

      case "forgotPassword":
        this.currentView = new ForgotPasswordView(this);
        break;

      case "resetPassword":
        this.currentView = new ResetPasswordView(this);
        break;

      case "dashboard":
        this.currentView = new DashboardView(this, params);
        break;

      case "events":
        this.currentView = new EventsView(this);
        break;

      case "events/create":
        this.currentView = new CreateEvent(this, params);
        break;

      case "events/edit":
        this.currentView = new CreateEvent(this, params);
        break;

      case "users":
        this.currentView = new UsersAdminView(this);
        break;

      case "details":
        this.currentView = new EventDetails(this, params);
        break;

      case "projects":
        this.currentView = new Teams(this);
        break;
      case "browseProjects":
        this.currentView = new BrowseProjects(this);
        break;
      case "teamDetail": // ← NUEVO
        this.currentView = new TeamDetailView(this, params);
        break;

      case "ranking":
        this.currentView = new Ranking(this);
        break;

      case "gradesAudit":
        this.currentView = new GradesAuditView(this);
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
        this.currentView = new PublicProfileView(this, { userId: getCurrentUser()?.id_user });
        break;

      case "publicProfile":
        this.currentView = new PublicProfileView(this, params);
        break;

      case "tlDashboard":
        this.currentView = new TLDashboardView(this);
        this.currentView.init();
        return;

      case "vote":
        this.currentView = new PublicVotingPage(this, params);
        this.currentView.render(this.app);
        return;

      case "staffVote":
        this.currentView = new PublicVotingPage(this, { ...params, isStaff: true });
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
