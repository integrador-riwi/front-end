import "../assets/styles/main.css";
import LoginView from "../views/LoginView.js";
import DashboardView from "../views/DashboardView.js";
import { isAuthenticated } from "../utils/auth.js";
import CreateEvent from "../views/createEvent.js";
import Teams from "../views/TeamsAndProjects.js";
import Ranking from "../views/Ranking.js";
import coderHome from "../views/coderHome.js";
import { getCurrentUser } from "../utils/helpers.js";

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.user = getCurrentUser();
    this.init();
  }

  init(){
    if (!isAuthenticated()) {
      this.navigate("login");
      return;
    }

    console.log(this.user)
    switch (this.user?.role) {
      case "ADMIN":
        this.navigate("dashboard");
        break;
      case "CODER":
        this.navigate("coderHome");
        break;
      default:
        this.navigate("login");
    }
  }


  navigate(route) {
    this.app.innerHTML = "";
    this.currentRoute = route;

    switch (route) {
      case "login":
        this.currentView = new LoginView(this);
        break;
      case "dashboard":
        this.currentView = new DashboardView(this);
        break;
      case "events/create":
        this.currentView = new CreateEvent(this);
        break;
      case "projects":
        this.currentView = new Teams(this);
        break;
      case "ranking":
        this.currentView = new Ranking(this);
        break;
      case "coderHome":
        this.currentView = new coderHome(this)
        break;
      default:
        this.navigate("login");
      console.log(this.currentRoute)
    }

    this.currentView.render();
  }
}

new App();