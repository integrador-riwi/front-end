import "../assets/styles/main.css";
import "../components/Toast/index.js";
import LoginView from "../views/LoginView.js";
import DashboardView from "../views/DashboardView.js";
import { isAuthenticated } from "../utils/auth.js";
import CreateEvent from "../views/createEvent.js";
import EventDetails from "../views/eventDetails.js";
import Teams from "../views/TeamsAndProjects.js";
import Ranking from "../views/Ranking.js";
import coderHome from "../views/coderHome.js";
import CoderEventSelect from "../views/codereventselect.js";
import { getCurrentUser } from "../utils/helpers.js";
import ProjectSettings from "../views/ProjectSettings.js";
import EventsView from "../views/EventsView.js";
import ProfileView from "../views/ProfileView.js";
import TLDashboardView from "../views/TLDashboardView.js";
import { i18nReady } from "../utils/i18n.js";

await i18nReady;
import QRVoting from "../views/EventVoting.js"
import NotFoundView from "../views/NotFoundView.js";
const ROUTE_PERMISSIONS = {
  login: "PUBLIC",
  dashboard: ["ADMIN", "STAFF"],
  events: ["ADMIN", "STAFF"],
  "events/create": ["ADMIN"],
  details: ["ADMIN", "STAFF"],
  projects: ["ADMIN", "STAFF", "CODER"],
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
};

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.user = getCurrentUser();
    this.currentParams = {};
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

    if (this.currentView && typeof this.currentView.destroy === "function") {
      this.currentView.destroy();
    }
    this.currentView = null;

    this.app.innerHTML = "";
    this.currentRoute = route;
    this.currentParams = params;

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
