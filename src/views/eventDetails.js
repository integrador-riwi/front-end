import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import * as XLSX from "xlsx";
import { getEventById } from "../services/api-events.js";
import { apiFetch } from "../services/api.js";
import { getUser } from "../utils/auth.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/details.css";
export default class EventDetails {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.eventId = params.eventId || null;
    this.eventName = params?.name;
    this.event = null;
    this.loading = true;
    this.error = null;
  }

  async fetchCurrentEvent() {
    try {
      this.loading = true;

      if (!this.eventId) {
        throw new Error("Event ID not provided");
      }

      const response = await getEventById(this.eventId);
      this.event = response.data || response;
    } catch (err) {
      console.error("Failed to fetch event:", err);
      this.error = err.message || t("common.error");
      toast.error(t("common.errorTitle"), this.error);
    } finally {
      this.loading = false;
    }
  }

  formatDate(dateString) {
    if (!dateString) return "TBD";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getStatusBadge(status) {
    if (status === "COMPLETED") {
      return `<span class="badge-status mb-3 d-inline-block">${t("eventDetails.completed")}</span>`;
    } else if (status === "UPCOMING") {
      return `<span class="badge-status mb-3 d-inline-block">${t("eventDetails.upcoming")}</span>`;
    } else if (status === "IN_PROGRESS") {
      return `<span class="badge-status mb-3 d-inline-block">${t("eventDetails.inProgress")}</span>`;
    }
    return `<span class="badge-status mb-3 d-inline-block">${status}</span>`;
  }

  renderEvent(event) {
    const title = event.title || event.name || "Untitled Event";
    const desc = event.description || t("common.noDescription");
    const canEdit = this.user?.role === "ADMIN";
    const canReport = ["ADMIN", "STAFF"].includes(this.user?.role);

    return `
        <div class="col-lg-8">
            ${this.getStatusBadge(event.status)}
            <h1 class="fw-bold mb-3">${title}</h1>
            <p class="text-muted fs-5">
                ${desc}
            </p>
            </div>

            <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
            ${canReport ? `<button id="event-teams-report-btn" class="btn btn-primary me-2" style="background:var(--accent);border-color:var(--accent);">${t("dashboard.teamsReport")}</button>` : ""}
            ${canEdit ? `<button id="edit-event-btn" class="btn btn-outline-accent me-2">${t("eventDetails.edit")}</button>` : ""}
        </div>
      `;
  }

  renderEventDate(event) {
    const date = event.date || event.start_date || event.createdAt;

    return `
        <small class="text-muted">${t("eventDetails.dateTime")}</small>
        <p class="fw-semibold mb-0">${this.formatDate(date)}</p>
      `;
  }

  renderEventInfo(event) {
    return `
        <small class="text-muted">${t("eventDetails.type")}</small>
        <p class="fw-semibold mb-0">${event.event_type || t("eventDetails.na")}</p>
        
        <small class="text-muted mt-3 d-block">${t("eventDetails.route")}</small>
        <p class="fw-semibold mb-0">${event.route || t("eventDetails.na")}</p>
      `;
  }

  renderLoading() {
    return `
        <div class="d-flex justify-content-center align-items-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;
  }

  renderError(message) {
    return `
        <div class="alert alert-danger rounded-4 mt-4" role="alert">
          ${message}
        </div>
      `;
  }

  async render() {
    const app = document.getElementById("app");

    const mainContent = await fetch(
        `../../pages/admin_event_details.html`,
    ).then((r) => r.text());

    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0">
        ${this.header.render()}
          <main class="dashboard-main">
          ${mainContent}
        </main>
      </div>
    `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    const eventContainer = document.getElementById("event-container");
    const dateContainer = document.getElementById("event-date");
    const locationContainer = document.getElementById("event-location");

    if (!eventContainer || !dateContainer || !locationContainer) {
      console.error("Container elements not found");
      return;
    }

    eventContainer.innerHTML = this.renderLoading();

    await this.fetchCurrentEvent();

    if (this.error) {
      eventContainer.innerHTML = this.renderError(this.error);
      return;
    }

    if (!this.event) {
      eventContainer.innerHTML = this.renderError(
          t("events.notFound") ?? t("events.notFound") ?? "Event not found",
      );
      return;
    }

    eventContainer.innerHTML = this.renderEvent(this.event);
    dateContainer.innerHTML = this.renderEventDate(this.event);
    locationContainer.innerHTML = this.renderEventInfo(this.event);

    this.attachEventHandlers();

    this._offLangChange = onLangChange(() => this.render());
  }

  attachEventHandlers() {
    const viewProjectsBtn = document.getElementById("view-projects-btn");
    viewProjectsBtn?.addEventListener("click", (e) => {
      const route = e.currentTarget.dataset.route;
      if (route) {
        this.router.navigate(route);
      }
    });

    const editBtn = document.getElementById("edit-event-btn");
    editBtn?.addEventListener("click", () => {
      if (this.eventId) {
        this.router.navigate("events/edit", { eventId: this.eventId });
      }
    });

    const reportBtn = document.getElementById("event-teams-report-btn");
    reportBtn?.addEventListener("click", async () => {
      const originalText = reportBtn.textContent;
      reportBtn.disabled = true;
      reportBtn.textContent = t("dashboard.generatingExcel");

      try {
        const teams = await this.fetchAllTeamsForReport();
        if (!teams.length) {
          toast.info(t("dashboard.reportEmptyTitle"), t("dashboard.reportEmptyMsg"));
          return;
        }
        this.downloadTeamsExcel(teams);
        toast.success(t("dashboard.excelReadyTitle"), t("dashboard.excelReadyMsg"));
      } catch (err) {
        console.error("Teams Excel report error:", err);
        toast.error(t("common.errorTitle"), err?.message ?? t("dashboard.excelError"));
      } finally {
        reportBtn.disabled = false;
        reportBtn.textContent = originalText;
      }
    });

    const editRubricsBtn = document.getElementById("edit-rubrics-btn");
    if (this.user?.role !== "ADMIN") {
      editRubricsBtn?.classList.add("d-none");
      return;
    }
    editRubricsBtn?.addEventListener("click", () => {
      if (this.eventId) {
        this.router.navigate("events/edit", { eventId: this.eventId });
      }
    });
  }

  async fetchAllTeamsForReport() {
    const limit = 100;
    let page = 1;
    let totalPages = 1;
    const teams = [];

    do {
      const response = await apiFetch(
        `/teams?idEvent=${encodeURIComponent(this.eventId)}&page=${page}&limit=${limit}&includeSubmitted=true&includeClosed=true`,
        { method: "GET" },
      );
      const payload = response?.data ?? response ?? {};
      teams.push(...(payload.teams ?? []));
      totalPages = payload.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    return teams;
  }

  downloadTeamsExcel(teams) {
    const workbook = XLSX.utils.book_new();
    const sortedTeams = [...teams].sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "es", { sensitivity: "base" }),
    );
    const eventName = this.event?.title || this.event?.event_name || this.eventName || "Evento";
    const createdAt = new Date();
    const createdDate = this.formatReportDateForFile(createdAt);

    const teamsRows = sortedTeams.map((team, index) => {
      const members = team.members ?? [];
      const leader = members.find((member) => member.team_role === "LEADER");
      const clans = [...new Set(members.map((member) => member.clan).filter(Boolean))];
      const memberNames = members.length
        ? members.map((member) => member.name || "Integrante sin nombre").join(", ")
        : "Sin integrantes registrados";

      return {
        "#": index + 1,
        "ID equipo": team.id_team ?? "",
        "Equipo": team.name || "Equipo sin nombre",
        "Descripción": String(team.description ?? "").trim() || "Sin descripción registrada",
        "Total integrantes": this.teamMemberCount(team),
        "Integrantes": memberNames,
        "Líder": leader?.name || "Sin líder registrado",
        "Clanes": clans.length ? clans.join(", ") : "Sin clan registrado",
        "Estado": team.closed_at ? "Cerrado" : "Abierto",
        "Fecha de creación del equipo": this.formatReportDate(team.created_at),
      };
    });

    const teamsSheet = XLSX.utils.json_to_sheet(teamsRows);
    teamsSheet["!cols"] = [
      { wch: 6 },
      { wch: 10 },
      { wch: 28 },
      { wch: 60 },
      { wch: 18 },
      { wch: 60 },
      { wch: 28 },
      { wch: 36 },
      { wch: 14 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, teamsSheet, "Equipos");
    workbook.Props = {
      Title: `Reporte de equipos - ${eventName} - ${createdDate}`,
      Subject: "Reporte de equipos por evento",
      Author: "TeamUp",
      Company: "TeamUp",
      CreatedDate: createdAt,
    };

    XLSX.writeFile(workbook, `${this.fileSafeName(`reporte-equipos-${eventName}-${createdDate}`)}.xlsx`);
  }

  teamMemberCount(team) {
    if (Array.isArray(team.members)) return team.members.length;
    const count = Number(team.member_count);
    return Number.isFinite(count) ? count : 0;
  }

  formatReportDate(value) {
    if (!value) return "No registrada";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No registrada";
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  formatReportDateForFile(value) {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  fileSafeName(value) {
    return String(value ?? "reporte")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 90) || "reporte-equipos";
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
