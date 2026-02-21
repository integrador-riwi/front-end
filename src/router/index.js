import "../../src/assets/styles/main.css";

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.init();
  }

  init() {
    this.app.innerHTML = "<h1>Start</h1><p>Melo</p>";
  }
}

new App();
