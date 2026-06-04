import Navbar from "../components/navbar/navbar.js";
import { getUsers, sendWelcomeEmailsToUsers } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import { icons } from "../utils/icons.js";
import "../assets/styles/dashboard.css";

export default class UsersAdminView {
  constructor(router) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.loading = true;
    this.users = [];
    this.clans = {}; // { "clanName": [user1, user2] }
    this.sending = false;
  }

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0 mx-0 mw-100" style="padding-top: 60px !important;">
        <main class="dashboard-main p-4 mx-auto" style="max-width: 1200px;">
          <div id="users-admin-root">
            <div class="d-flex flex-column align-items-center justify-content-center" style="height: 40vh; gap: 16px;">
              <div class="ce-spinner" style="width: 40px; height: 40px; border-width: 4px; border-top-color: var(--accent);"></div>
              <p class="text-muted fw-medium">Cargando usuarios...</p>
            </div>
          </div>
        </main>
      </div>
    `;
    this.navbar.attachEventHandlers();
    await this.loadUsers();
  }

  async loadUsers() {
    try {
      this.loading = true;
      const res = await getUsers({ limit: 1000 });
      // Depending on API response structure, users array might be nested in data.users
      this.users = res.data?.users ?? res.users ?? (Array.isArray(res.data) ? res.data : []);
      this.groupUsersByClan();
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Error", "No se pudieron cargar los usuarios.");
    } finally {
      this.loading = false;
      this.paint();
    }
  }

  groupUsersByClan() {
    this.clans = {};
    for (const user of this.users) {
      if (user.role === "ADMIN" || user.role === "STAFF") continue;
      const clanName = user.clan || "Sin Clan";
      if (!this.clans[clanName]) {
        this.clans[clanName] = [];
      }
      this.clans[clanName].push(user);
    }
  }

  paint() {
    const root = document.getElementById("users-admin-root");
    if (!root) return;

    if (Object.keys(this.clans).length === 0) {
      root.innerHTML = `
        <div class="text-center py-5">
          <p class="text-muted fs-5">No hay usuarios registrados o con clanes asignados.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="fw-bold" style="color: var(--navy);">Gestión de Usuarios</h2>
          <p class="text-muted mb-0">Envía credenciales de bienvenida a los coders por clan o individualmente.</p>
        </div>
      </div>
      
      <div class="d-flex flex-column gap-4">
    `;

    for (const [clanName, users] of Object.entries(this.clans)) {
      html += `
        <div class="card shadow-sm border-0" style="border-radius: 12px; overflow: hidden;">
          <div class="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-light text-primary border px-3 py-2 fs-6 fw-bold" style="color: var(--accent) !important; border-color: var(--accent-dim) !important;">
                ${clanName}
              </span>
              <span class="text-muted small fw-semibold">${users.length} miembros</span>
            </div>
            <button class="btn btn-sm send-clan-btn" data-clan="${clanName}" style="background: var(--accent); color: white; border-radius: 8px; font-weight: 600; padding: 6px 12px; border: none;">
              <span style="display: flex; align-items: center; gap: 4px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                Enviar a todo el clan
              </span>
            </button>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0" style="font-size: 0.9rem;">
                <thead class="table-light text-muted">
                  <tr>
                    <th class="fw-semibold px-4 py-3" style="width: 35%;">Nombre</th>
                    <th class="fw-semibold px-4 py-3" style="width: 35%;">Correo</th>
                    <th class="fw-semibold px-4 py-3 text-end" style="width: 30%;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(user => `
                    <tr>
                      <td class="px-4 py-3 align-middle fw-medium" style="color: var(--navy);">${user.name}</td>
                      <td class="px-4 py-3 align-middle text-muted">${user.email}</td>
                      <td class="px-4 py-3 align-middle text-end">
                        <button class="btn btn-sm send-individual-btn" data-userid="${user.id_user}" style="background: white; color: var(--navy); border: 1px solid var(--border); border-radius: 6px; font-weight: 500;">
                          Enviar individual
                        </button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    html += `</div>`;
    root.innerHTML = html;
    this.attachHandlers();
  }

  attachHandlers() {
    const clanBtns = document.querySelectorAll(".send-clan-btn");
    clanBtns.forEach(btn => {
      btn.addEventListener("click", (e) => this.handleSendClan(e.currentTarget));
    });

    const individualBtns = document.querySelectorAll(".send-individual-btn");
    individualBtns.forEach(btn => {
      btn.addEventListener("click", (e) => this.handleSendIndividual(e.currentTarget));
    });
  }

  async handleSendClan(btn) {
    const clanName = btn.dataset.clan;
    if (!confirm(`¿Estás seguro de enviar el correo de bienvenida a TODO el clan ${clanName}?`)) return;

    this.setButtonLoading(btn, true);
    try {
      const response = await sendWelcomeEmailsToUsers({ clan: clanName });
      toast.success("Enviado", response.message || `Correos enviados al clan ${clanName}.`);
    } catch (err) {
      toast.error("Error", err.message || "Error enviando correos.");
    } finally {
      this.setButtonLoading(btn, false, "Enviar a todo el clan");
    }
  }

  async handleSendIndividual(btn) {
    const userId = btn.dataset.userid;
    this.setButtonLoading(btn, true, true);
    try {
      const response = await sendWelcomeEmailsToUsers({ userIds: [userId] });
      toast.success("Enviado", response.message || "Correo enviado exitosamente.");
    } catch (err) {
      toast.error("Error", err.message || "Error enviando correo.");
    } finally {
      this.setButtonLoading(btn, false, "Enviar individual", true);
    }
  }

  setButtonLoading(btn, isLoading, originalText = "", isIndividual = false) {
    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="width: 14px; height: 14px;"></span>`;
    } else {
      btn.disabled = false;
      if (isIndividual) {
        btn.innerHTML = originalText;
      } else {
        btn.innerHTML = `
          <span style="display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            ${originalText}
          </span>
        `;
      }
    }
  }

  destroy() {}
}
