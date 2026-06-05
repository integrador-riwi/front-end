import * as XLSX from "xlsx";
import Navbar from "../components/navbar/navbar.js";
import {
  createUser,
  deleteUser,
  getUsers,
  sendWelcomeEmailsToUsers,
  updateUser,
  updateUserPassword,
  updateUserStatus,
  getTeams,
} from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import { icons } from "../utils/icons.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/usersAdmin.css";

const ROLES = [
  { value: "CODER", label: "Coder" },
  { value: "TL_DEVELOPMENT", label: "TL Desarrollo" },
  { value: "TL_SOFT_SKILLS", label: "TL Soft Skills" },
  { value: "TL_ENGLISH", label: "TL Ingles" },
  { value: "STAFF", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
];

const DOCUMENT_TYPES = ["CC", "TI", "CE", "PASSPORT"];

const CLAN_MAPPING = {
  TESLA: "G1 (Tesla)",
  TURING: "G4 (Turing)",
  MCCARTHY: "G3 (McCarthy)",
};

const actionIcons = {
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4z"/><path d="m4 7 8 6 8-6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 16H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 0 1-15.6 6.1"/><path d="M3 12A9 9 0 0 1 18.6 5.9"/><path d="M21 5v7h-7"/><path d="M3 19v-7h7"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5h18"/><path d="M6 12h12"/><path d="M10 19h4"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/><path d="M19 15l.8 2.7L22 18.5l-2.2.8L19 22l-.8-2.7-2.2-.8 2.2-.8L19 15z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const normalizeClan = (value = "") => {
  const clan = String(value || "").trim();
  const upperClan = normalizeText(clan);

  for (const [key, mappedClan] of Object.entries(CLAN_MAPPING)) {
    if (upperClan.includes(key)) return mappedClan;
  }

  return clan;
};

const buildClanPassword = (clan) => {
  if (!clan) return "";

  const clanText = String(clan).trim();
  const clanMatch = clanText.match(/\(([^)]+)\)/);
  const clanName = (clanMatch ? clanMatch[1] : clanText).trim().toLowerCase();

  return clanName ? `${clanName}.riwi2026*` : "";
};

const findKey = (keys, candidates) =>
  keys.find((key) => {
    const normalizedKey = normalizeText(key);
    return candidates.some((candidate) => normalizedKey.includes(normalizeText(candidate)));
  });

export default class UsersAdminView {
  constructor(router) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.loading = true;
    this.users = [];
    this.teams = [];
    this.selectedUsers = new Set();
    this.importRows = [];
    this.modal = null;
    this.filters = {
      search: "",
      role: "",
      clan: "",
      isActive: "",
    };
  }

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="ua-page">
        <main class="ua-shell">
          <div id="users-admin-root" class="ua-root">
            ${this.renderLoading()}
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
      this.users = res.data?.users ?? res.users ?? (Array.isArray(res.data) ? res.data : []);

      // Cargar lista de clanes/equipos desde backend para poblar selects
      try {
        const teamsRes = await getTeams({ limit: 1000 });
        // teamsRes could be { data: { teams: [...] } } or array
        this.teams = teamsRes.data?.teams ?? teamsRes.teams ?? (Array.isArray(teamsRes) ? teamsRes : teamsRes.data ?? []);
      } catch (tErr) {
        console.warn('No se pudieron cargar los equipos:', tErr);
        this.teams = [...new Set(this.users.map(u => u.clan).filter(Boolean))];
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Error", "No se pudieron cargar los usuarios.");
    } finally {
      this.loading = false;
      this.paint();
    }
  }

  paint() {
    const root = document.getElementById("users-admin-root");
    if (!root) return;

    if (this.loading) {
      root.innerHTML = this.renderLoading();
      return;
    }

    const stats = this.getStats();
    const clans = this.getClans();
    const filteredUsers = this.getFilteredUsers();
    const importStats = this.getImportStats();

    root.innerHTML = `
      ${this.renderHeader(stats)}
      ${this.renderMetrics(stats)}
      <section class="ua-workspace">
        <div class="ua-main-column">
          ${this.renderToolbar(clans, filteredUsers.length)}
          ${this.renderBulkBar(filteredUsers.length)}
          ${this.renderUsersTable(filteredUsers)}
        </div>
        <aside class="ua-side-column">
          ${this.renderInvitePanel(clans)}
          ${this.renderManualPanel()}
          ${this.renderImportPanel(importStats)}
        </aside>
      </section>
      ${this.renderModal()}
    `;

    this.attachHandlers();
  }

  renderLoading() {
    return `
      <div class="ua-loading">
        <div class="ce-spinner ua-spinner"></div>
        <p>Cargando usuarios...</p>
      </div>
    `;
  }

  renderHeader(stats) {
    return `
      <header class="ua-header">
        <div>
          <span class="ua-eyebrow">Panel admin</span>
          <h1>Gestion de usuarios</h1>
          <p>Administra altas, roles, clanes, accesos e invitaciones sin salir del flujo.</p>
        </div>
        <div class="ua-header-actions">
          <button class="ua-btn ua-btn-secondary" id="refreshUsersBtn" type="button">
            <span class="ua-btn-icon">${actionIcons.refresh}</span>
            Actualizar
          </button>
          <button class="ua-btn ua-btn-primary" id="newUserBtn" type="button">
            <span class="ua-btn-icon">${icons.plus()}</span>
            Nuevo usuario
          </button>
        </div>
        <div class="ua-header-summary">
          <strong>${stats.total}</strong>
          <span>usuarios registrados</span>
        </div>
      </header>
    `;
  }

  renderMetrics(stats) {
    const cards = [
      { label: "Activos", value: stats.active, tone: "mint", icon: icons.check() },
      { label: "Inactivos", value: stats.inactive, tone: "coral", icon: icons.danger() },
      { label: "Coders", value: stats.coders, tone: "accent", icon: icons.code() },
      { label: "Clanes", value: stats.clans, tone: "gold", icon: icons.users() },
    ];

    return `
      <section class="ua-metrics">
        ${cards.map((card) => `
          <article class="ua-metric ua-tone-${card.tone}">
            <div>
              <span>${card.label}</span>
              <strong>${card.value}</strong>
            </div>
            <span class="ua-metric-icon">${card.icon}</span>
          </article>
        `).join("")}
      </section>
    `;
  }

  renderToolbar(clans, count) {
    return `
      <section class="ua-toolbar">
        <div class="ua-search">
          <span>${icons.users()}</span>
          <input id="userSearchInput" type="search" placeholder="Buscar por nombre o correo" value="${escapeHtml(this.filters.search)}">
        </div>
        <div class="ua-filter-group">
          <span class="ua-filter-icon">${actionIcons.filter}</span>
          <select id="roleFilter" class="ua-control" aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            ${ROLES.map((role) => `<option value="${role.value}" ${this.filters.role === role.value ? "selected" : ""}>${role.label}</option>`).join("")}
          </select>
        </div>
        <select id="clanFilter" class="ua-control" aria-label="Filtrar por clan">
          <option value="">Todos los clanes</option>
          ${clans.map((clan) => `<option value="${escapeHtml(clan)}" ${this.filters.clan === clan ? "selected" : ""}>${escapeHtml(clan)}</option>`).join("")}
        </select>
        <select id="statusFilter" class="ua-control" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="true" ${this.filters.isActive === "true" ? "selected" : ""}>Activos</option>
          <option value="false" ${this.filters.isActive === "false" ? "selected" : ""}>Inactivos</option>
        </select>
        <span class="ua-count">${count} resultados</span>
      </section>
    `;
  }

  renderBulkBar(count) {
    if (this.selectedUsers.size === 0) {
      return `
        <section class="ua-bulk-bar ua-bulk-bar-muted">
          <span class="ua-bulk-icon">${actionIcons.spark}</span>
          <p>Selecciona usuarios en la tabla para enviar invitaciones individuales en lote.</p>
        </section>
      `;
    }

    return `
      <section class="ua-bulk-bar">
        <div>
          <strong>${this.selectedUsers.size} seleccionados</strong>
          <span>de ${count} usuarios visibles</span>
        </div>
        <button class="ua-btn ua-btn-primary" id="sendSelectedBtn" type="button">
          <span class="ua-btn-icon">${actionIcons.mail}</span>
          Enviar invitaciones
        </button>
      </section>
    `;
  }

  renderUsersTable(users) {
    if (users.length === 0) {
      return `
        <section class="ua-empty">
          <span>${icons.users()}</span>
          <h2>No hay usuarios para estos filtros</h2>
          <p>Ajusta la busqueda o crea un usuario nuevo.</p>
        </section>
      `;
    }

    const allVisibleSelected = users.every((user) => this.selectedUsers.has(String(user.id_user)));

    return `
      <section class="ua-table-wrap">
        <table class="ua-table">
          <thead>
            <tr>
              <th class="ua-check-col">
                <input id="selectVisibleUsers" type="checkbox" ${allVisibleSelected ? "checked" : ""} aria-label="Seleccionar usuarios visibles">
              </th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Clan</th>
              <th>Documento</th>
              <th>Estado</th>
              <th class="ua-actions-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((user) => this.renderUserRow(user)).join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  renderUserRow(user) {
    const role = ROLES.find((item) => item.value === user.role)?.label ?? user.role;
    const userId = String(user.id_user);
    const initials = String(user.name || user.email || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

    return `
      <tr>
        <td class="ua-check-col">
          <input class="user-select" data-userid="${userId}" type="checkbox" ${this.selectedUsers.has(userId) ? "checked" : ""} aria-label="Seleccionar ${escapeHtml(user.name)}">
        </td>
        <td>
          <div class="ua-user-cell">
            <span class="ua-avatar">${escapeHtml(initials)}</span>
            <div>
              <strong>${escapeHtml(user.name)}</strong>
              <span>${escapeHtml(user.email)}</span>
            </div>
          </div>
        </td>
        <td><span class="ua-role-pill">${escapeHtml(role)}</span></td>
        <td>${user.clan ? `<span class="ua-clan-pill">${escapeHtml(user.clan)}</span>` : `<span class="ua-muted">Sin clan</span>`}</td>
        <td>
          <span class="ua-doc">${escapeHtml(user.document_type || "CC")} ${escapeHtml(user.document_number || "")}</span>
        </td>
        <td>
          <button class="ua-status ${user.is_active ? "is-active" : "is-inactive"}" data-action="toggle-status" data-userid="${userId}" type="button">
            ${user.is_active ? "Activo" : "Inactivo"}
          </button>
        </td>
        <td>
          <div class="ua-row-actions">
            <button class="ua-icon-btn" data-action="send" data-userid="${userId}" type="button" title="Enviar invitacion">${actionIcons.mail}</button>
            <button class="ua-icon-btn" data-action="edit" data-userid="${userId}" type="button" title="Editar usuario">${icons.edit()}</button>
            <button class="ua-icon-btn" data-action="password" data-userid="${userId}" type="button" title="Cambiar contrasena">${actionIcons.lock}</button>
            <button class="ua-icon-btn ua-icon-danger" data-action="delete" data-userid="${userId}" type="button" title="Eliminar usuario">${actionIcons.trash}</button>
          </div>
        </td>
      </tr>
    `;
  }

  renderInvitePanel(clans) {
    return `
      <section class="ua-panel">
        <div class="ua-panel-header">
          <span class="ua-panel-icon">${actionIcons.mail}</span>
          <div>
            <h2>Invitaciones</h2>
            <p>Envio por clan completo o por seleccion desde la tabla.</p>
          </div>
        </div>
        <label class="ua-label" for="inviteClanSelect">Clan</label>
        <select id="inviteClanSelect" class="ua-field">
          <option value="">Selecciona un clan</option>
          ${clans.map((clan) => `<option value="${escapeHtml(clan)}">${escapeHtml(clan)}</option>`).join("")}
        </select>
        <button class="ua-btn ua-btn-primary ua-full" id="sendClanInviteBtn" type="button">
          <span class="ua-btn-icon">${actionIcons.mail}</span>
          Enviar a todo el clan
        </button>
      </section>
    `;
  }

  renderManualPanel() {
    return `
      <section class="ua-panel ua-panel-compact">
        <div class="ua-panel-header">
          <span class="ua-panel-icon ua-panel-icon-mint">${icons.plus()}</span>
          <div>
            <h2>Alta manual</h2>
            <p>Crea un usuario puntual con rol, clan y documento.</p>
          </div>
        </div>
        <button class="ua-btn ua-btn-secondary ua-full" id="manualCreateBtn" type="button">
          <span class="ua-btn-icon">${icons.plus()}</span>
          Crear desde formulario
        </button>
      </section>
    `;
  }

  renderImportPanel(importStats) {
    const { validRows, duplicateRows, invalidRows } = importStats;

    return `
      <section class="ua-panel">
        <div class="ua-panel-header">
          <span class="ua-panel-icon">${actionIcons.file}</span>
          <div>
            <h2>Importar XLSX</h2>
            <p>Valida duplicados por correo o documento antes de crear.</p>
          </div>
        </div>
        <div class="ua-import-schema">
          <span>Columnas esperadas</span>
          <strong>nombre, correo, documento, clan</strong>
        </div>
        <input id="xlsxInput" type="file" accept=".xlsx,.xls" hidden>
        <button class="ua-btn ua-btn-secondary ua-full" id="chooseXlsxBtn" type="button">
          <span class="ua-btn-icon">${icons.upload()}</span>
          Seleccionar archivo
        </button>
        ${this.importRows.length > 0 ? `
          <div class="ua-import-stats">
            <span><strong>${validRows.length}</strong> listos</span>
            <span><strong>${duplicateRows.length}</strong> repetidos</span>
            <span><strong>${invalidRows.length}</strong> incompletos</span>
          </div>
          <div class="ua-import-preview">
            ${this.importRows.slice(0, 6).map((row) => `
              <div class="ua-import-row is-${row.status}">
                <div>
                  <strong>${escapeHtml(row.name || "Sin nombre")}</strong>
                  <span>${escapeHtml(row.email || row.reason)}</span>
                </div>
                <small>Fila ${row.rowNumber}</small>
              </div>
            `).join("")}
          </div>
          <button class="ua-btn ua-btn-primary ua-full" id="createImportedUsersBtn" type="button" ${validRows.length === 0 ? "disabled" : ""}>
            Crear ${validRows.length} usuarios
          </button>
          <button class="ua-text-btn" id="clearImportBtn" type="button">Limpiar importacion</button>
        ` : ""}
      </section>
    `;
  }

  renderModal() {
    if (!this.modal) return "";

    if (this.modal.type === "user") return this.renderUserModal(this.modal.user);
    if (this.modal.type === "password") return this.renderPasswordModal(this.modal.user);

    return "";
  }

  renderUserModal(user = null) {
    const isEditing = Boolean(user);
    const clanPassword = buildClanPassword(user?.clan);

    return `
      <div class="ua-modal-backdrop" role="presentation">
        <section class="ua-modal" role="dialog" aria-modal="true" aria-labelledby="userModalTitle">
          <header class="ua-modal-header">
            <div>
              <span class="ua-eyebrow">${isEditing ? "Editar" : "Crear"}</span>
              <h2 id="userModalTitle">${isEditing ? "Editar usuario" : "Nuevo usuario"}</h2>
            </div>
            <button class="ua-icon-btn" id="closeModalBtn" type="button" title="Cerrar">${actionIcons.close}</button>
          </header>
          <form id="userForm" class="ua-form">
            <label class="ua-label">Nombre
              <input class="ua-field" name="name" value="${escapeHtml(user?.name || "")}" required>
            </label>
            <label class="ua-label">Correo
              <input class="ua-field" name="email" type="email" value="${escapeHtml(user?.email || "")}" required>
            </label>
            <div class="ua-form-grid">
              <label class="ua-label">Tipo documento
                <select class="ua-field" name="documentType">
                  ${DOCUMENT_TYPES.map((type) => `<option value="${type}" ${(user?.document_type || "CC") === type ? "selected" : ""}>${type}</option>`).join("")}
                </select>
              </label>
              <label class="ua-label">Documento
                <input class="ua-field" name="documentNumber" value="${escapeHtml(user?.document_number || "")}" required>
              </label>
            </div>
            <div class="ua-form-grid">
              <label class="ua-label">Rol
                <select class="ua-field" name="role">
                  ${ROLES.map((role) => `<option value="${role.value}" ${(user?.role || "CODER") === role.value ? "selected" : ""}>${role.label}</option>`).join("")}
                </select>
              </label>
              <label class="ua-label">Clan
                ${this.teams && this.teams.length > 0 ? `
                  <select class="ua-field" name="clan">
                    <option value="">-- Sin clan --</option>
                    ${this.teams.map((t) => `<option value="${escapeHtml(t.name || t)}" ${(t.name === user?.clan || t === user?.clan) ? 'selected' : ''}>${escapeHtml(t.name || t)}</option>`).join("")}
                  </select>
                ` : `
                  <input class="ua-field" name="clan" value="${escapeHtml(user?.clan || "")}" placeholder="G3 (McCarthy)">
                `}
              </label>
            </div>
            ${isEditing ? `
              <div class="ua-inline-actions">
                <button class="ua-btn ua-btn-secondary" id="sendIndividualInviteBtn" type="button">
                  <span class="ua-btn-icon">${actionIcons.mail}</span>
                  Enviar invitacion
                </button>
              </div>
            ` : `
              <label class="ua-label">Contrasena inicial
                <input class="ua-field" name="password" placeholder="Opcional: se usa clan.riwi2026*">
              </label>
              <label class="ua-check-label">
                <input type="checkbox" name="sendInvite" id="sendInviteCheckbox">
                <span>Enviar invitacion individual al crear</span>
              </label>
            `}
            <p class="ua-form-note">
              ${clanPassword ? `Con el clan actual, la invitacion mostrara: ${escapeHtml(clanPassword)}` : "La invitacion necesita un clan valido para calcular la contrasena."}
            </p>
            <footer class="ua-modal-actions">
              <button class="ua-btn ua-btn-secondary" id="cancelModalBtn" type="button">Cancelar</button>
              <button class="ua-btn ua-btn-primary" type="submit">${isEditing ? "Guardar cambios" : "Crear usuario"}</button>
            </footer>
          </form>
        </section>
      </div>
    `;
  }

  renderPasswordModal(user) {
    const suggestedPassword = buildClanPassword(user?.clan);

    return `
      <div class="ua-modal-backdrop" role="presentation">
        <section class="ua-modal ua-modal-small" role="dialog" aria-modal="true" aria-labelledby="passwordModalTitle">
          <header class="ua-modal-header">
            <div>
              <span class="ua-eyebrow">Seguridad</span>
              <h2 id="passwordModalTitle">Cambiar contrasena</h2>
            </div>
            <button class="ua-icon-btn" id="closeModalBtn" type="button" title="Cerrar">${actionIcons.close}</button>
          </header>
          <form id="passwordForm" class="ua-form">
            <p class="ua-modal-copy">${escapeHtml(user?.name || "")}</p>
            <label class="ua-label">Nueva contrasena
              <input class="ua-field" name="password" value="${escapeHtml(suggestedPassword)}" required minlength="6">
            </label>
            <footer class="ua-modal-actions">
              <button class="ua-btn ua-btn-secondary" id="cancelModalBtn" type="button">Cancelar</button>
              <button class="ua-btn ua-btn-primary" type="submit">Actualizar</button>
            </footer>
          </form>
        </section>
      </div>
    `;
  }

  attachHandlers() {
    document.getElementById("refreshUsersBtn")?.addEventListener("click", () => this.loadUsers());
    document.getElementById("newUserBtn")?.addEventListener("click", () => {
      this.modal = { type: "user", user: null };
      this.paint();
    });
    document.getElementById("manualCreateBtn")?.addEventListener("click", () => {
      this.modal = { type: "user", user: null };
      this.paint();
    });

    document.getElementById("userSearchInput")?.addEventListener("input", (event) => {
      this.filters.search = event.target.value;
      this.paint();
    });
    document.getElementById("roleFilter")?.addEventListener("change", (event) => {
      this.filters.role = event.target.value;
      this.paint();
    });
    document.getElementById("clanFilter")?.addEventListener("change", (event) => {
      this.filters.clan = event.target.value;
      this.paint();
    });
    document.getElementById("statusFilter")?.addEventListener("change", (event) => {
      this.filters.isActive = event.target.value;
      this.paint();
    });

    document.getElementById("sendSelectedBtn")?.addEventListener("click", () => this.sendSelectedInvites());
    document.getElementById("sendClanInviteBtn")?.addEventListener("click", () => this.sendClanInvites());
    document.getElementById("chooseXlsxBtn")?.addEventListener("click", () => document.getElementById("xlsxInput")?.click());
    document.getElementById("xlsxInput")?.addEventListener("change", (event) => this.handleXlsxFile(event));
    document.getElementById("createImportedUsersBtn")?.addEventListener("click", () => this.createImportedUsers());
    document.getElementById("clearImportBtn")?.addEventListener("click", () => {
      this.importRows = [];
      this.paint();
    });

    document.getElementById("selectVisibleUsers")?.addEventListener("change", (event) => {
      const visibleUsers = this.getFilteredUsers();
      for (const user of visibleUsers) {
        const userId = String(user.id_user);
        if (event.target.checked) this.selectedUsers.add(userId);
        else this.selectedUsers.delete(userId);
      }
      this.paint();
    });

    document.querySelectorAll(".user-select").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        const userId = event.currentTarget.dataset.userid;
        if (event.currentTarget.checked) this.selectedUsers.add(userId);
        else this.selectedUsers.delete(userId);
        this.paint();
      });
    });

    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", (event) => this.handleUserAction(event.currentTarget));
    });

    document.getElementById("closeModalBtn")?.addEventListener("click", () => this.closeModal());
    document.getElementById("cancelModalBtn")?.addEventListener("click", () => this.closeModal());
    document.getElementById("sendIndividualInviteBtn")?.addEventListener("click", () => {
      const user = this.modal?.user;
      if (!user) return;
      this.sendIndividualInvite(user);
    });
    document.getElementById("userForm")?.addEventListener("submit", (event) => this.submitUserForm(event));
    document.getElementById("passwordForm")?.addEventListener("submit", (event) => this.submitPasswordForm(event));
  }

  async handleUserAction(button) {
    const userId = button.dataset.userid;
    const user = this.users.find((item) => String(item.id_user) === String(userId));
    if (!user) return;

    switch (button.dataset.action) {
      case "send":
        await this.sendIndividualInvite(user);
        break;
      case "edit":
        this.modal = { type: "user", user };
        this.paint();
        break;
      case "password":
        this.modal = { type: "password", user };
        this.paint();
        break;
      case "toggle-status":
        await this.toggleUser(user);
        break;
      case "delete":
        await this.deleteUser(user);
        break;
      default:
        break;
    }
  }

  async submitUserForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      documentType: data.documentType,
      documentNumber: data.documentNumber.trim(),
      clan: normalizeClan(data.clan),
    };

    try {
      if (this.modal?.user) {
        await updateUser(this.modal.user.id_user, payload);
        toast.success("Actualizado", "Usuario actualizado correctamente.");
      } else {
        payload.password = data.password?.trim() || buildClanPassword(payload.clan) || payload.documentNumber;
        const created = await createUser(payload);
        toast.success("Creado", "Usuario creado correctamente.");

        // If checkbox sendInvite present, send invitation to the created user
        const formData = new FormData(form);
        const sendInvite = formData.get("sendInvite");
        const createdUserId = created?.data?.user?.id_user ?? created?.user?.id_user ?? created?.id_user ?? null;
        if (sendInvite && createdUserId) {
          try {
            await sendWelcomeEmailsToUsers({ userIds: [createdUserId] });
            toast.success("Invitacion enviada", "Correo de bienvenida enviado.");
          } catch (e) {
            toast.error("Error", "No se pudo enviar la invitacion.");
          }
        }
      }
      this.closeModal(false);
      await this.loadUsers();
    } catch (error) {
      toast.error("Error", error.message || "No se pudo guardar el usuario.");
    }
  }

  async submitPasswordForm(event) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password")?.trim();

    try {
      await updateUserPassword(this.modal.user.id_user, password);
      toast.success("Actualizado", "Contrasena actualizada correctamente.");
      this.closeModal();
    } catch (error) {
      toast.error("Error", error.message || "No se pudo actualizar la contrasena.");
    }
  }

  async toggleUser(user) {
    try {
      await updateUserStatus(user.id_user, !user.is_active);
      toast.success("Estado actualizado", `${user.name} ahora esta ${user.is_active ? "inactivo" : "activo"}.`);
      await this.loadUsers();
    } catch (error) {
      toast.error("Error", error.message || "No se pudo cambiar el estado.");
    }
  }

  async deleteUser(user) {
    const ok = confirm(`Eliminar a ${user.name} es una accion permanente. ¿Quieres continuar?`);
    if (!ok) return;

    try {
      await deleteUser(user.id_user);
      this.selectedUsers.delete(String(user.id_user));
      toast.success("Eliminado", "Usuario eliminado correctamente.");
      await this.loadUsers();
    } catch (error) {
      toast.error("Error", error.message || "No se pudo eliminar el usuario.");
    }
  }

  async sendIndividualInvite(user) {
    try {
      const response = await sendWelcomeEmailsToUsers({ userIds: [user.id_user] });
      toast.success("Invitacion enviada", response.data?.message || response.message || "Correo enviado.");
    } catch (error) {
      toast.error("Error", error.message || "No se pudo enviar la invitacion.");
    }
  }

  async sendSelectedInvites() {
    const userIds = [...this.selectedUsers];
    if (userIds.length === 0) return;

    try {
      const response = await sendWelcomeEmailsToUsers({ userIds });
      toast.success("Invitaciones enviadas", response.data?.message || response.message || "Correos enviados.");
      this.selectedUsers.clear();
      this.paint();
    } catch (error) {
      toast.error("Error", error.message || "No se pudieron enviar las invitaciones.");
    }
  }

  async sendClanInvites() {
    const clan = document.getElementById("inviteClanSelect")?.value;
    if (!clan) {
      toast.warning("Selecciona un clan", "Elige un clan para enviar invitaciones.");
      return;
    }

    const ok = confirm(`Se enviara el correo de bienvenida a todo el clan ${clan}. ¿Continuar?`);
    if (!ok) return;

    try {
      const response = await sendWelcomeEmailsToUsers({ clan });
      toast.success("Invitaciones enviadas", response.data?.message || response.message || `Correos enviados a ${clan}.`);
    } catch (error) {
      toast.error("Error", error.message || "No se pudieron enviar las invitaciones.");
    }
  }

  async handleXlsxFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      this.importRows = this.normalizeImportRows(rows);
      this.paint();
    } catch (error) {
      console.error("Error reading xlsx:", error);
      toast.error("Archivo invalido", "No se pudo leer el archivo XLSX.");
    } finally {
      event.target.value = "";
    }
  }

  normalizeImportRows(rows) {
    if (!rows.length) return [];

    const keys = Object.keys(rows[0]);
    const emailKey = findKey(keys, ["email", "correo"]);
    const documentKey = findKey(keys, ["cedula", "cedula", "documento", "document", "id"]);
    const nameKey = findKey(keys, ["nombre", "name"]);
    const clanKey = findKey(keys, ["clan", "grupo"]);
    const roleKey = findKey(keys, ["rol", "role"]);
    const documentTypeKey = findKey(keys, ["tipo", "document_type", "document type"]);

    const existingEmails = new Set(this.users.map((user) => String(user.email || "").toLowerCase()));
    const existingDocuments = new Set(this.users.map((user) => String(user.document_number || "")));
    const fileEmails = new Set();
    const fileDocuments = new Set();

    return rows.map((row, index) => {
      const email = String(row[emailKey] || "").trim().toLowerCase();
      const documentNumber = String(row[documentKey] || "").trim();
      const name = String(row[nameKey] || "").trim();
      const clan = normalizeClan(row[clanKey]);
      const roleRaw = normalizeText(row[roleKey] || "CODER");
      const role = ROLES.some((item) => item.value === roleRaw) ? roleRaw : "CODER";
      const documentType = String(row[documentTypeKey] || "CC").trim().toUpperCase() || "CC";

      let status = "valid";
      let reason = "";

      if (!email || !documentNumber || !name) {
        status = "invalid";
        reason = "Faltan nombre, correo o documento";
      } else if (existingEmails.has(email) || existingDocuments.has(documentNumber) || fileEmails.has(email) || fileDocuments.has(documentNumber)) {
        status = "duplicate";
        reason = "Ya existe por correo o documento";
      }

      if (email) fileEmails.add(email);
      if (documentNumber) fileDocuments.add(documentNumber);

      return {
        rowNumber: index + 2,
        name,
        email,
        documentNumber,
        documentType,
        role,
        clan,
        password: buildClanPassword(clan) || documentNumber,
        status,
        reason,
      };
    });
  }

  getImportStats() {
    return {
      validRows: this.importRows.filter((row) => row.status === "valid"),
      duplicateRows: this.importRows.filter((row) => row.status === "duplicate"),
      invalidRows: this.importRows.filter((row) => row.status === "invalid"),
    };
  }

  async createImportedUsers() {
    const validRows = this.importRows.filter((row) => row.status === "valid");
    if (validRows.length === 0) return;

    let created = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        await createUser({
          name: row.name,
          email: row.email,
          role: row.role,
          documentNumber: row.documentNumber,
          documentType: row.documentType,
          clan: row.clan,
          password: row.password,
        });
        created++;
      } catch (error) {
        failed++;
      }
    }

    toast.success("Importacion finalizada", `${created} usuarios creados, ${failed} con error.`);
    this.importRows = [];
    await this.loadUsers();
  }

  getFilteredUsers() {
    const search = normalizeText(this.filters.search);

    return this.users.filter((user) => {
      const matchesSearch = !search
        || normalizeText(user.name).includes(search)
        || normalizeText(user.email).includes(search)
        || normalizeText(user.document_number).includes(search);
      const matchesRole = !this.filters.role || user.role === this.filters.role;
      const matchesClan = !this.filters.clan || user.clan === this.filters.clan;
      const matchesStatus = this.filters.isActive === "" || String(user.is_active) === this.filters.isActive;

      return matchesSearch && matchesRole && matchesClan && matchesStatus;
    });
  }

  getClans() {
    return [...new Set(this.users.map((user) => user.clan).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  getStats() {
    const active = this.users.filter((user) => user.is_active).length;
    const inactive = this.users.length - active;

    return {
      total: this.users.length,
      active,
      inactive,
      coders: this.users.filter((user) => user.role === "CODER").length,
      clans: this.getClans().length,
    };
  }

  closeModal(repaint = true) {
    this.modal = null;
    if (repaint) this.paint();
  }

  destroy() {}
}
