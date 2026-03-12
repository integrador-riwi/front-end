import "../assets/styles/main.css";
import LoginView from "../views/LoginView.js";
import DashboardView from "../views/DashboardView.js";
import { isAuthenticated } from "../utils/auth.js";
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
import { getMyProfile, getMyTeams } from "../services/api.js";

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.user = null;
    this.hasTeam = false;
    this.currentParams = {};
    this.init();
  }

  async init() {
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

    try {
      const user = await getMyProfile();
      this.user = user;

      this.hasTeam = await this.checkUserTeam();

      switch (this.user?.role) {
        case "ADMIN":
          this.navigate("events");
          break;

        case "CODER":
          if (this.hasTeam) {
            this.navigate("coderHome");
          } else {
            this.navigate("coderEventSelect");
          }
          break;

        case "TL_DEVELOPMENT":
        case "TL_SOFT_SKILLS":
        case "TL_ENGLISH":
          this.navigate("coderEventSelect");
          break;

        default:
          this.navigate("login");
      }
    } catch (error) {
      console.error("Auth error:", error);
      this.navigate("login");
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

  navigate(route, params = {}) {    
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

      case "ranking":
        this.currentView = new Ranking(this);
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
        return this.navigate("login");
    }

    if (!this.currentView) {
      console.error("No view created for route:", route);
      return;
    }

    this.currentView.render();
  }
}

new App();