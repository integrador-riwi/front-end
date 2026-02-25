import "../assets/styles/main.css";
import LoginView from "../views/LoginView.js";
import DashboardView from "../views/DashboardView.js";
import { isAuthenticated } from "../utils/auth.js";
import CreateEvent from "../views/createEvent.js";
import EventDetails from "../views/eventDetails.js";
import Teams from "../views/TeamsAndProjects.js";
import Ranking from "../views/Ranking.js";
import QRVoting from "../views/EventVoting.js";
import coderHome from "../views/coderHome.js";
import { getCurrentUser } from "../utils/helpers.js";
import ProjectSettings from "../views/projectSettings.js";
import EventsView from "../views/EventsView.js";

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
        this.navigate("dashboard");
        break;
      case "CODER":
        console.log("hello")
        this.navigate("coderHome");
        break;
      default:
        this.navigate("login");
    }
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
        this.currentView = new DashboardView(this);
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
      case "qr-voting":
        this.currentView = new QRVoting(this);
        break;
      case "coderHome":
        this.currentView = new coderHome(this)
        break;
      case "projectSettings":
        this.currentView = new ProjectSettings(this)
        break;
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
