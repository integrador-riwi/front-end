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
import TeamDetailView from "../views/TeamDetailView.js";   // ← NUEVO
import { i18nReady } from "../utils/i18n.js";

await i18nReady;
import QRVoting from "../views/EventVoting.js"
import NotFoundView from "../views/NotFoundView.js";
class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.user = getCurrentUser();
    this.currentParams = {};
    this.init();
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
    console.log("USER FROM STORAGE:", this.user);
    console.log("ROLE:", this.user?.role);

    console.log("User:", this.user);
    console.log("Role:", this.user?.role);
    console.log("Authenticated:", isAuthenticated());
    switch (this.user?.role) {
      case "ADMIN":
        this.navigate("events");
        break;
      case "CODER":
        this.navigate("coderEventSelect");
        break;
      case "TL_DEVELOPMENT":
        this.navigate("coderEventSelect");
        break;
      case "TL_SOFT_SKILLS":
        this.navigate("coderEventSelect");
        break;
      case "TL_ENGLISH":
        this.navigate("coderEventSelect");
        break;
      default:
        this.navigate("login");
    }
  }

  navigate(route, params = {}) {
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
        console.log(params);
        break;
      case "projects":
        this.currentView = new Teams(this);
        break;
      case "teamDetail":                                    // ← NUEVO
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
