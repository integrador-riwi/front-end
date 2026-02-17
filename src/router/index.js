// import "./../assets/styles/main.css";

class App {
  constructor() {
    this.app = document.getElementById("app");
    this.init();
  }

  async init() {
    // this.app.innerHTML = "<h1>Start</h1><p>Melo</p>";
    const html = await fetch(`./../../pages/login.html`).then(r => r.text())
    this.app.innerHTML = html;
  }
}

new App();
