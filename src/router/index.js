// frontend/src/router/index.js
import "../assets/styles/main.css";
import LoginView from "../views/LoginView.js";
import DashboardView from "../views/DashboardView.js";
import CreateEvent from "../views/createEvent.js";
import Teams from "../views/TeamsAndProjects.js";

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.currentView = null;
    this.init();
  }

  init() {
    if (!localStorage.getItem("user")) {
    localStorage.setItem("user", JSON.stringify({
      name: "Carlos López",
      role: "ADMIN" 
    }));
    localStorage.setItem("token", "fake-token-123");
  }
    const token = localStorage.getItem("token");

    if (token) {
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
      case "events/create":
        this.currentView = new CreateEvent(this);
        break;
      case "projects":
        this.currentView = new Teams(this);
        break;
      default:
        this.navigate("login");
    }

    this.currentView.render();
  }
}


new App();