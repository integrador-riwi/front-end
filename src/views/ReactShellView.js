import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { mountReactIsland } from "../react/platform/mountReactIsland";
import { ReactShell } from "../react/app/ReactShell";

export default class ReactShellView {
  constructor(router, params = {}) {
    this.router = router;
    this.params = params;
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.reactRoot = null;
  }

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0 mx-0 mw-100">
        ${this.header.render()}
        <main class="dashboard-main">
          <div id="react-shell-root"></div>
        </main>
      </div>
    `;

    this.navbar.attachEventHandlers();
    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();

    const container = document.getElementById("react-shell-root");
    if (!container) return;

    this.reactRoot = mountReactIsland(container, ReactShell, {
      router: this.router,
      params: { ...this.params, source: this.params.source ?? "vanilla-route" },
    });
  }

  destroy() {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }
}
