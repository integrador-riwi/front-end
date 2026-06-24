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
  getEvents,
  getTeamsByEvent,
} from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import { icons } from "../utils/icons.js";
import { t } from "../utils/i18n.js";
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

const roleLabel = (role) => t(`usersAdmin.roles.${role}`) || role;

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
      github: "",
      event: "",
      teamStatus: "",
    };
    this.events = [];
    // Set of id_user (strings) who belong to a team in the currently-selected event
    this.eventTeamMemberIds = null;
    this.searchPaintTimeout = null;
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
      const [usersRes, eventsRes] = await Promise.all([
        getUsers({ limit: 1000 }),
        getEvents().catch(() => null),
      ]);
      this.users = usersRes.data?.users ?? usersRes.users ?? (Array.isArray(usersRes.data) ? usersRes.data : []);
      const eventsData = eventsRes?.data ?? eventsRes;
      this.events = eventsData?.events ?? (Array.isArray(eventsData) ? eventsData : []);

      // Cargar lista de clanes/equipos desde backend para poblar selects
      try {
        const teamsRes = await getTeams({ limit: 1000, includeSubmitted: true, includeClosed: true });
        this.teams = teamsRes.data?.teams ?? teamsRes.teams ?? (Array.isArray(teamsRes) ? teamsRes : teamsRes.data ?? []);
      } catch (tErr) {
        console.warn(t("usersAdmin.console.teamsLoadError"), tErr);
        this.teams = [...new Set(this.users.map(u => u.clan).filter(Boolean))];
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error(t("common.errorTitle"), t("usersAdmin.toast.loadUsersError"));
    } finally {
      this.loading = false;
      this.paint();
    }
  }

  async loadEventTeamMembers(eventId) {
    if (!eventId) {
      this.eventTeamMemberIds = null;
      this.paint();
      return;
    }
    try {
      const res = await getTeamsByEvent(eventId);
      const teams = res?.teams ?? res?.data?.teams ?? (Array.isArray(res) ? res : []);
      const ids = new Set();
      for (const team of teams) {
        const members = team.members ?? [];
        for (const m of members) {
          ids.add(String(m.id_user));
        }
      }
      this.eventTeamMemberIds = ids;
    } catch (err) {
      console.warn("Could not load event teams:", err);
      this.eventTeamMemberIds = null;
    }
    this.paint();
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
      <section class="ua-actions-grid">
        ${this.renderInvitePanel(clans)}
        ${this.renderImportPanel(importStats)}
      </section>
      <section class="ua-users-section">
        ${this.renderToolbar(clans, filteredUsers.length)}
        ${this.renderBulkBar(filteredUsers.length)}
        ${this.renderUsersTable(filteredUsers)}
      </section>
      ${this.renderModal()}
    `;

    this.attachHandlers();
  }

  renderLoading() {
    return `
      <div class="ua-loading">
        <div class="ce-spinner ua-spinner"></div>
        <p>${t("usersAdmin.loading")}</p>
      </div>
    `;
  }

  renderHeader() {
    return `
      <header class="ua-header">
        <div>
          <span class="ua-eyebrow">${t("usersAdmin.eyebrow")}</span>
          <h1>${t("usersAdmin.title")}</h1>
          <p>${t("usersAdmin.subtitle")}</p>
        </div>
        <div class="ua-header-actions">
          <button class="ua-btn ua-btn-primary" id="newUserBtn" type="button">
            <span class="ua-btn-icon">${icons.plus()}</span>
            ${t("usersAdmin.newUser")}
          </button>
        </div>
      </header>
    `;
  }

  renderMetrics(stats) {
    const cards = [
      { label: roleLabel("CODER"), value: stats.roles.CODER, tone: "accent", icon: icons.code() },
      { label: roleLabel("TL_DEVELOPMENT"), value: stats.roles.TL_DEVELOPMENT, tone: "mint", icon: icons.settings() },
      { label: roleLabel("TL_SOFT_SKILLS"), value: stats.roles.TL_SOFT_SKILLS, tone: "gold", icon: icons.bulb() },
      { label: roleLabel("TL_ENGLISH"), value: stats.roles.TL_ENGLISH, tone: "lilac", icon: icons.chat() },
      { label: roleLabel("STAFF"), value: stats.roles.STAFF, tone: "muted", icon: icons.blocks() },
      { label: roleLabel("ADMIN"), value: stats.roles.ADMIN, tone: "coral", icon: icons.settings() },
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
    const hasActiveFilters = this.filters.role || this.filters.clan || this.filters.isActive || this.filters.github || this.filters.search || this.filters.event || this.filters.teamStatus;
    return `
      <section class="ua-toolbar">
        <div class="ua-search">
          <span>${icons.users()}</span>
          <input id="userSearchInput" type="search" placeholder="${t("usersAdmin.searchPlaceholder")}" value="${escapeHtml(this.filters.search)}">
        </div>
        <div class="ua-filter-group">
          <span class="ua-filter-icon">${actionIcons.filter}</span>
          <select id="roleFilter" class="ua-control ua-select" aria-label="${t("usersAdmin.filterByRole")}">
            <option value="">${t("usersAdmin.allRoles")}</option>
            ${ROLES.map((role) => `<option value="${role.value}" ${this.filters.role === role.value ? "selected" : ""}>${roleLabel(role.value)}</option>`).join("")}
          </select>
        </div>
        <select id="clanFilter" class="ua-control ua-select" aria-label="${t("usersAdmin.filterByClan")}">
          <option value="">${t("usersAdmin.allClans")}</option>
          ${clans.map((clan) => `<option value="${escapeHtml(clan)}" ${this.filters.clan === clan ? "selected" : ""}>${escapeHtml(clan)}</option>`).join("")}
        </select>
        <select id="statusFilter" class="ua-control ua-select" aria-label="${t("usersAdmin.filterByStatus")}">
          <option value="">${t("usersAdmin.allStatuses")}</option>
          <option value="true" ${this.filters.isActive === "true" ? "selected" : ""}>${t("usersAdmin.active")}</option>
          <option value="false" ${this.filters.isActive === "false" ? "selected" : ""}>${t("usersAdmin.inactive")}</option>
        </select>
        <select id="githubFilter" class="ua-control ua-select" aria-label="Filtrar por GitHub">
          <option value="">Todos (GitHub)</option>
          <option value="linked" ${this.filters.github === "linked" ? "selected" : ""}>Con GitHub</option>
          <option value="unlinked" ${this.filters.github === "unlinked" ? "selected" : ""}>Sin GitHub</option>
        </select>
        <div class="ua-toolbar-divider"></div>
        <select id="eventFilter" class="ua-control ua-select ua-event-select" aria-label="Filtrar por evento">
          <option value="">Todos los eventos</option>
          ${this.events.map((ev) => `<option value="${escapeHtml(String(ev.id))}" ${this.filters.event === String(ev.id) ? "selected" : ""}>${escapeHtml(ev.title ?? ev.event_name ?? ev.id)}</option>`).join("")}
        </select>
        <select id="teamStatusFilter" class="ua-control ua-select" aria-label="Estado en evento" ${!this.filters.event ? "disabled" : ""}>
          <option value="">Todos (equipo)</option>
          <option value="in-team" ${this.filters.teamStatus === "in-team" ? "selected" : ""}>Con equipo</option>
          <option value="no-team" ${this.filters.teamStatus === "no-team" ? "selected" : ""}>Sin equipo</option>
        </select>
        ${hasActiveFilters ? `
          <button id="clearFiltersBtn" class="ua-btn ua-btn-ghost ua-btn-sm" type="button" title="Limpiar filtros">
            ${actionIcons.close} Limpiar
          </button>
        ` : ""}
        <span class="ua-count">${t("usersAdmin.results", { count })}</span>
      </section>
    `;
  }

  renderBulkBar(count) {
    if (this.selectedUsers.size === 0) {
      return `
        <section class="ua-bulk-bar ua-bulk-bar-muted">
          <span class="ua-bulk-icon">${actionIcons.spark}</span>
          <p>${t("usersAdmin.bulkHint")}</p>
        </section>
      `;
    }

    return `
      <section class="ua-bulk-bar">
        <div>
          <strong>${t("usersAdmin.selectedCount", { count: this.selectedUsers.size })}</strong>
          <span>${t("usersAdmin.visibleUsers", { count })}</span>
        </div>
        <button class="ua-btn ua-btn-primary" id="sendSelectedBtn" type="button">
          <span class="ua-btn-icon">${actionIcons.mail}</span>
          ${t("usersAdmin.sendInvitations")}
        </button>
      </section>
    `;
  }

  renderUsersTable(users) {
    if (users.length === 0) {
      return `
        <section class="ua-empty">
          <span>${icons.users()}</span>
          <h2>${t("usersAdmin.emptyTitle")}</h2>
          <p>${t("usersAdmin.emptyDescription")}</p>
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
                <input id="selectVisibleUsers" type="checkbox" ${allVisibleSelected ? "checked" : ""} aria-label="${t("usersAdmin.selectVisible")}">
              </th>
              <th>${t("usersAdmin.table.user")}</th>
              <th>${t("usersAdmin.table.role")}</th>
              <th>${t("usersAdmin.table.clan")}</th>
              <th>${t("usersAdmin.table.status")}</th>
              <th class="ua-actions-col">${t("usersAdmin.table.actions")}</th>
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
    const role = roleLabel(user.role);
    const userId = String(user.id_user);
    const githubUsername = user.github_username
      ? `@${String(user.github_username).replace(/^@/, "")}`
      : t("usersAdmin.github.missing");
    const avatarUrl = user.github_avatar_url;
    const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
    const profileTitle = t("usersAdmin.github.viewProfile", { name: user.name });

    return `
      <tr>
        <td class="ua-check-col">
          <input class="user-select" data-userid="${userId}" type="checkbox" ${this.selectedUsers.has(userId) ? "checked" : ""} aria-label="${t("usersAdmin.selectUser", { name: user.name })}">
        </td>
        <td>
          <button
            class="ua-user-cell ua-user-profile-link"
            data-profile-userid="${userId}"
            type="button"
            title="${escapeHtml(profileTitle)}"
          >
            ${avatarUrl
              ? `<img class="ua-user-avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(user.name)}">`
              : `<span class="ua-user-avatar ua-user-avatar-fallback">${escapeHtml(initial)}</span>`
            }
            <div class="ua-user-info">
              <strong>${escapeHtml(user.name)}</strong>
              <span>${escapeHtml(user.email)}</span>
              <small class="${user.github_username ? "ua-github-user" : "ua-github-missing"}">
                ${escapeHtml(githubUsername)}
              </small>
            </div>
          </button>
        </td>
        <td><span class="ua-role-pill">${escapeHtml(role)}</span></td>
        <td>${user.clan ? `<span class="ua-clan-pill">${escapeHtml(user.clan)}</span>` : `<span class="ua-muted">${t("usersAdmin.noClan")}</span>`}</td>
        <td>
          <button class="ua-status ${user.is_active ? "is-active" : "is-inactive"}" data-action="toggle-status" data-userid="${userId}" type="button">
            ${user.is_active ? t("usersAdmin.active") : t("usersAdmin.inactive")}
          </button>
        </td>
        <td>
          <div class="ua-row-actions">
            <button class="ua-icon-btn" data-action="send" data-userid="${userId}" type="button" title="${t("usersAdmin.actions.send")}">${actionIcons.mail}</button>
            <button class="ua-icon-btn" data-action="edit" data-userid="${userId}" type="button" title="${t("usersAdmin.actions.edit")}">${icons.edit()}</button>
            <button class="ua-icon-btn" data-action="password" data-userid="${userId}" type="button" title="${t("usersAdmin.actions.password")}">${actionIcons.lock}</button>
            <button class="ua-icon-btn ua-icon-danger" data-action="delete" data-userid="${userId}" type="button" title="${t("usersAdmin.actions.delete")}">${actionIcons.trash}</button>
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
            <h2>${t("usersAdmin.invites.title")}</h2>
            <p>${t("usersAdmin.invites.description")}</p>
          </div>
        </div>
        <label class="ua-label" for="inviteClanSelect">${t("usersAdmin.clan")}</label>
        <select id="inviteClanSelect" class="ua-field ua-select">
          <option value="">${t("usersAdmin.selectClan")}</option>
          ${clans.map((clan) => `<option value="${escapeHtml(clan)}">${escapeHtml(clan)}</option>`).join("")}
        </select>
        <button class="ua-btn ua-btn-primary ua-full" id="sendClanInviteBtn" type="button">
          <span class="ua-btn-icon">${actionIcons.mail}</span>
          ${t("usersAdmin.invites.sendClan")}
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
            <h2>${t("usersAdmin.import.title")}</h2>
            <p>${t("usersAdmin.import.description")}</p>
          </div>
        </div>
        <div class="ua-import-schema">
          <span>${t("usersAdmin.import.expectedColumns")}</span>
          <strong>${t("usersAdmin.import.columns")}</strong>
        </div>
        <input id="xlsxInput" type="file" accept=".xlsx,.xls" hidden>
        <button class="ua-btn ua-btn-secondary ua-full" id="chooseXlsxBtn" type="button">
          <span class="ua-btn-icon">${icons.upload()}</span>
          ${t("usersAdmin.import.chooseFile")}
        </button>
        ${this.importRows.length > 0 ? `
          <div class="ua-import-stats">
            <span><strong>${validRows.length}</strong> ${t("usersAdmin.import.ready")}</span>
            <span><strong>${duplicateRows.length}</strong> ${t("usersAdmin.import.duplicates")}</span>
            <span><strong>${invalidRows.length}</strong> ${t("usersAdmin.import.incomplete")}</span>
          </div>
          <div class="ua-import-preview">
            ${this.importRows.slice(0, 6).map((row) => `
              <div class="ua-import-row is-${row.status}">
                <div>
                  <strong>${escapeHtml(row.name || t("usersAdmin.import.noName"))}</strong>
                  <span>${escapeHtml(row.email || (row.reasonKey ? t(row.reasonKey) : row.reason))}</span>
                </div>
                <small>${t("usersAdmin.import.row", { row: row.rowNumber })}</small>
              </div>
            `).join("")}
          </div>
          <button class="ua-btn ua-btn-primary ua-full" id="createImportedUsersBtn" type="button" ${validRows.length === 0 ? "disabled" : ""}>
            ${t("usersAdmin.import.createUsers", { count: validRows.length })}
          </button>
          <button class="ua-text-btn" id="clearImportBtn" type="button">${t("usersAdmin.import.clear")}</button>
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
              <span class="ua-eyebrow">${isEditing ? t("usersAdmin.modal.editMode") : t("usersAdmin.modal.createMode")}</span>
              <h2 id="userModalTitle">${isEditing ? t("usersAdmin.modal.editTitle") : t("usersAdmin.modal.createTitle")}</h2>
            </div>
            <button class="ua-icon-btn" id="closeModalBtn" type="button" title="${t("usersAdmin.close")}">${actionIcons.close}</button>
          </header>
          <form id="userForm" class="ua-form">
            <label class="ua-label">${t("usersAdmin.form.name")}
              <input class="ua-field" name="name" value="${escapeHtml(user?.name || "")}" required>
            </label>
            <label class="ua-label">${t("usersAdmin.form.email")}
              <input class="ua-field" name="email" type="email" value="${escapeHtml(user?.email || "")}" required>
            </label>
            <div class="ua-form-grid">
              <label class="ua-label">${t("usersAdmin.form.documentType")}
                <select class="ua-field ua-select" name="documentType">
                  ${DOCUMENT_TYPES.map((type) => `<option value="${type}" ${(user?.document_type || "CC") === type ? "selected" : ""}>${type}</option>`).join("")}
                </select>
              </label>
              <label class="ua-label">${t("usersAdmin.form.documentNumber")}
                <input class="ua-field" name="documentNumber" value="${escapeHtml(user?.document_number || "")}" required>
              </label>
            </div>
            <div class="ua-form-grid">
              <label class="ua-label">${t("usersAdmin.form.role")}
                <select class="ua-field ua-select" name="role">
                  ${ROLES.map((role) => `<option value="${role.value}" ${(user?.role || "CODER") === role.value ? "selected" : ""}>${roleLabel(role.value)}</option>`).join("")}
                </select>
              </label>
              <label class="ua-label">${t("usersAdmin.form.clan")}
                ${this.teams && this.teams.length > 0 ? `
                  <select class="ua-field ua-select" name="clan">
                    <option value="">${t("usersAdmin.noClanOption")}</option>
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
                  ${t("usersAdmin.modal.sendInvite")}
                </button>
              </div>
            ` : `
              <label class="ua-label">${t("usersAdmin.form.initialPassword")}
                <input class="ua-field" name="password" placeholder="${t("usersAdmin.form.initialPasswordPlaceholder")}">
              </label>
              <label class="ua-check-label">
                <input type="checkbox" name="sendInvite" id="sendInviteCheckbox">
                <span>${t("usersAdmin.form.sendInviteOnCreate")}</span>
              </label>
            `}
            <p class="ua-form-note">
              ${clanPassword ? t("usersAdmin.form.passwordPreview", { password: escapeHtml(clanPassword) }) : t("usersAdmin.form.passwordNeedsClan")}
            </p>
            <footer class="ua-modal-actions">
              <button class="ua-btn ua-btn-secondary" id="cancelModalBtn" type="button">${t("common.cancel")}</button>
              <button class="ua-btn ua-btn-primary" type="submit">${isEditing ? t("usersAdmin.modal.saveChanges") : t("usersAdmin.modal.createUser")}</button>
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
              <span class="ua-eyebrow">${t("usersAdmin.password.security")}</span>
              <h2 id="passwordModalTitle">${t("usersAdmin.password.title")}</h2>
            </div>
            <button class="ua-icon-btn" id="closeModalBtn" type="button" title="${t("usersAdmin.close")}">${actionIcons.close}</button>
          </header>
          <form id="passwordForm" class="ua-form">
            <p class="ua-modal-copy">${escapeHtml(user?.name || "")}</p>
            <label class="ua-label">${t("usersAdmin.password.newPassword")}
              <input class="ua-field" name="password" value="${escapeHtml(suggestedPassword)}" required minlength="6">
            </label>
            <footer class="ua-modal-actions">
              <button class="ua-btn ua-btn-secondary" id="cancelModalBtn" type="button">${t("common.cancel")}</button>
              <button class="ua-btn ua-btn-primary" type="submit">${t("usersAdmin.password.update")}</button>
            </footer>
          </form>
        </section>
      </div>
    `;
  }

  attachHandlers() {
    document.getElementById("newUserBtn")?.addEventListener("click", () => {
      this.modal = { type: "user", user: null };
      this.paint();
    });

    document.getElementById("userSearchInput")?.addEventListener("input", (event) => {
      this.filters.search = event.target.value;
      this.scheduleSearchPaint();
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
    document.getElementById("githubFilter")?.addEventListener("change", (event) => {
      this.filters.github = event.target.value;
      this.paint();
    });
    document.getElementById("eventFilter")?.addEventListener("change", (event) => {
      this.filters.event = event.target.value;
      this.filters.teamStatus = "";
      this.eventTeamMemberIds = null;
      if (this.filters.event) {
        this.loadEventTeamMembers(this.filters.event);
      } else {
        this.paint();
      }
    });
    document.getElementById("teamStatusFilter")?.addEventListener("change", (event) => {
      this.filters.teamStatus = event.target.value;
      this.paint();
    });
    document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
      this.filters = { search: "", role: "", clan: "", isActive: "", github: "", event: "", teamStatus: "" };
      this.eventTeamMemberIds = null;
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

    document.querySelectorAll("[data-profile-userid]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.router.navigate("publicProfile", {
          userId: event.currentTarget.dataset.profileUserid,
        });
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

  scheduleSearchPaint() {
    clearTimeout(this.searchPaintTimeout);
    this.searchPaintTimeout = setTimeout(() => {
      this.paint();
      requestAnimationFrame(() => {
        const input = document.getElementById("userSearchInput");
        if (!input) return;
        input.focus();
        const cursorPosition = input.value.length;
        input.setSelectionRange(cursorPosition, cursorPosition);
      });
    }, 180);
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
        toast.success(t("usersAdmin.toast.updatedTitle"), t("usersAdmin.toast.updatedMessage"));
      } else {
        payload.password = data.password?.trim() || buildClanPassword(payload.clan) || payload.documentNumber;
        const created = await createUser(payload);
        toast.success(t("usersAdmin.toast.createdTitle"), t("usersAdmin.toast.createdMessage"));

        // If checkbox sendInvite present, send invitation to the created user
        const formData = new FormData(form);
        const sendInvite = formData.get("sendInvite");
        const createdUserId = created?.data?.user?.id_user ?? created?.user?.id_user ?? created?.id_user ?? null;
        if (sendInvite && createdUserId) {
          try {
            await sendWelcomeEmailsToUsers({ userIds: [createdUserId] });
            toast.success(t("usersAdmin.toast.inviteSentTitle"), t("usersAdmin.toast.welcomeEmailSent"));
          } catch (e) {
            toast.error(t("common.errorTitle"), t("usersAdmin.toast.inviteError"));
          }
        }
      }
      this.closeModal(false);
      await this.loadUsers();
    } catch (error) {
      toast.error(t("common.errorTitle"), error.message || t("usersAdmin.toast.saveError"));
    }
  }

  async submitPasswordForm(event) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password")?.trim();

    try {
      await updateUserPassword(this.modal.user.id_user, password);
      toast.success(t("usersAdmin.toast.updatedTitle"), t("usersAdmin.toast.passwordUpdated"));
      this.closeModal();
    } catch (error) {
      toast.error(t("common.errorTitle"), error.message || t("usersAdmin.toast.passwordError"));
    }
  }

  async toggleUser(user) {
    try {
      await updateUserStatus(user.id_user, !user.is_active);
      toast.success(
        t("usersAdmin.toast.statusUpdatedTitle"),
        t(user.is_active ? "usersAdmin.toast.nowInactive" : "usersAdmin.toast.nowActive", { name: user.name }),
      );
      await this.loadUsers();
    } catch (error) {
      toast.error(t("common.errorTitle"), error.message || t("usersAdmin.toast.statusError"));
    }
  }

  async deleteUser(user) {
    const ok = confirm(t("usersAdmin.confirm.delete", { name: user.name }));
    if (!ok) return;

    try {
      await deleteUser(user.id_user);
      this.selectedUsers.delete(String(user.id_user));
      toast.success(t("usersAdmin.toast.deletedTitle"), t("usersAdmin.toast.deletedMessage"));
      await this.loadUsers();
    } catch (error) {
      toast.error(t("common.errorTitle"), error.message || t("usersAdmin.toast.deleteError"));
    }
  }

  async sendIndividualInvite(user) {
    try {
      const response = await sendWelcomeEmailsToUsers({ userIds: [user.id_user] });
      toast.success(t("usersAdmin.toast.inviteSentTitle"), response.data?.message || response.message || t("usersAdmin.toast.emailSent"));
    } catch (error) {
      toast.error(t("common.errorTitle"), error.message || t("usersAdmin.toast.inviteError"));
    }
  }

  async sendSelectedInvites() {
    const userIds = [...this.selectedUsers];
    if (userIds.length === 0) return;

    try {
      const response = await sendWelcomeEmailsToUsers({ userIds });
      toast.success(t("usersAdmin.toast.invitesSentTitle"), response.data?.message || response.message || t("usersAdmin.toast.emailsSent"));
      this.selectedUsers.clear();
      this.paint();
    } catch (error) {
      toast.error(t("common.errorTitle"), error.message || t("usersAdmin.toast.invitesError"));
    }
  }

  async sendClanInvites() {
    const clan = document.getElementById("inviteClanSelect")?.value;
    if (!clan) {
      toast.warning(t("usersAdmin.toast.selectClanTitle"), t("usersAdmin.toast.selectClanMessage"));
      return;
    }

    const ok = confirm(t("usersAdmin.confirm.sendClan", { clan }));
    if (!ok) return;

    try {
      const response = await sendWelcomeEmailsToUsers({ clan });
      toast.success(t("usersAdmin.toast.invitesSentTitle"), response.data?.message || response.message || t("usersAdmin.toast.clanEmailsSent", { clan }));
    } catch (error) {
      toast.error(t("common.errorTitle"), error.message || t("usersAdmin.toast.invitesError"));
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
      toast.error(t("usersAdmin.toast.invalidFileTitle"), t("usersAdmin.toast.invalidFileMessage"));
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
      let reasonKey = "";

      if (!email || !documentNumber || !name) {
        status = "invalid";
        reasonKey = "usersAdmin.import.missingFields";
      } else if (existingEmails.has(email) || existingDocuments.has(documentNumber) || fileEmails.has(email) || fileDocuments.has(documentNumber)) {
        status = "duplicate";
        reasonKey = "usersAdmin.import.duplicateReason";
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
        reasonKey,
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

    toast.success(t("usersAdmin.toast.importDoneTitle"), t("usersAdmin.toast.importDoneMessage", { created, failed }));
    this.importRows = [];
    await this.loadUsers();
  }

  getFilteredUsers() {
    const search = normalizeText(this.filters.search);

    return this.users.filter((user) => {
      const matchesSearch = !search
        || normalizeText(user.name).includes(search)
        || normalizeText(user.email).includes(search)
        || normalizeText(user.document_number).includes(search)
        || normalizeText(user.github_username).includes(search);
      const matchesRole = !this.filters.role || user.role === this.filters.role;
      const matchesClan = !this.filters.clan || user.clan === this.filters.clan;
      const matchesStatus = this.filters.isActive === "" || String(user.is_active) === this.filters.isActive;
      const hasGithub = Boolean(user.github_username);
      const matchesGithub = !this.filters.github
        || (this.filters.github === "linked" && hasGithub)
        || (this.filters.github === "unlinked" && !hasGithub);

      // Team-membership filter (requires a selected event)
      let matchesTeamStatus = true;
      if (this.filters.event && this.filters.teamStatus) {
        const inEventTeam = this.eventTeamMemberIds
          ? this.eventTeamMemberIds.has(String(user.id_user))
          : false;
        if (this.filters.teamStatus === "in-team") matchesTeamStatus = inEventTeam;
        else if (this.filters.teamStatus === "no-team") matchesTeamStatus = !inEventTeam;
      }

      return matchesSearch && matchesRole && matchesClan && matchesStatus && matchesGithub && matchesTeamStatus;
    });
  }

  getClans() {
    return [...new Set(this.users.map((user) => user.clan).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  getStats() {
    const roles = Object.fromEntries(ROLES.map((role) => [role.value, 0]));

    for (const user of this.users) {
      if (roles[user.role] !== undefined) roles[user.role]++;
    }

    return {
      roles,
    };
  }

  closeModal(repaint = true) {
    this.modal = null;
    if (repaint) this.paint();
  }

  destroy() {
    clearTimeout(this.searchPaintTimeout);
  }
}
