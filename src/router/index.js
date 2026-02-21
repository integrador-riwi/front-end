import "../assets/styles/main.css";
import LoginView from "../views/LoginView.js";
import DashboardView from "../views/DashboardView.js";
import { isAuthenticated } from "../utils/auth.js";

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.init();
  }

  init() {
    if (isAuthenticated()) {
      this.navigate("dashboard");
    } else {
      this.navigate("login");
    }
  }

  navigate(route) {
    this.app.innerHTML = "";

    switch (route) {
      case "login":
        this.currentView = new LoginView(this);
        break;
      case "dashboard":
        this.currentView = new DashboardView(this);
        break;
      default:
        this.navigate("login");
    }

    this.currentView.render();
  }
}

new App();
