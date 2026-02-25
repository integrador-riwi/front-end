import "../assets/styles/profile.css";
import { exchangeGithubCode } from "../services/api.js";
import { getCurrentUser } from "../utils/helpers.js";

export default class GithubCallbackView {
  constructor(router) {
    this.router = router;
    this.user = getCurrentUser();
    this.app = document.getElementById("app");
  }

  renderMessage(title, message, action) {
    this.app.innerHTML = `
      <main class="coder-home-main profile-viewport">
        <div class="container-xl px-3 px-md-4 py-7">
          <div class="row justify-content-center">
            <div class="col-12 col-md-8 col-lg-6">
              <div class="bg-white rounded-4 p-4 ct-card-shadow text-center">
                <h2 class="profile-section-title mb-3">${title}</h2>
                <p class="mb-4">${message}</p>
                ${action ? `<button class="profile-btn" id="githubActionBtn">${action}</button>` : ""}
              </div>
            </div>
          </div>
        </div>
      </main>
    `;

    if (action) {
      document.getElementById("githubActionBtn")?.addEventListener("click", () => {
        action === "Ir a mi perfil" ? this.router.navigate("profile") : window.location.replace("/");
      });
    }
  }

  async exchange(code, state) {
    try {
      await exchangeGithubCode(code, state);
      this.renderMessage(
        "¡GitHub conectado!",
        "Tu cuenta de GitHub ya está vinculada. Volveremos a tu perfil para que puedas continuar.",
        "Ir a mi perfil"
      );
      window.history.replaceState({}, "", "/settings/github");
    } catch (error) {
      this.renderMessage(
        "No fue posible conectar",
        error.response?.data?.error || error?.message || "Ocurrió un error al vincular tu cuenta.",
        "Intentar de nuevo"
      );
    }
  }

  render() {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    if (error) {
      this.renderMessage("Autorización fallida", `GitHub devolvió: ${error}`, "Intentar de nuevo");
      return;
    }

    if (!code) {
      this.renderMessage("Código faltante", "No se recibió el código de autorización.", "Intentar de nuevo");
      return;
    }

    this.renderMessage("Conectando GitHub", "Estamos guardando tu autorización...", null);
    this.exchange(code, state);
  }
}
