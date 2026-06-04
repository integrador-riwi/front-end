import "../assets/styles/codereventselect.css";
import {
  getActiveEvents,
  apiFetch,
  acceptInvitation,
  rejectInvitation,
} from "../services/api.js";
import Navbar from "../components/navbar/navbar.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";

export default class CoderEventSelect {
  constructor(app) {
    this.app = app;
    this.user = app.user;
    this.navbar = new Navbar(app);
    this.events = [];
    this.isLoading = true;
    this.error = null;
  }

  async init() {
    this.render();
    try {
      const res = await getActiveEvents();
      this.events = res?.data ?? res ?? [];
    } catch (e) {
      this.error = t("ces.error");
      toast.error(t("common.errorTitle"), this.error);
    }

    try {
      const response = await apiFetch("/teams/my-teams", { method: "GET" });
      const data = response?.data ?? response;
      const pendingInvitations = data?.pendingInvitations ?? [];

      if (pendingInvitations.length > 0) {
        const inv = pendingInvitations[0];
        toast.info(
            t("invite.pendingInvitation") ?? "Pending invitation",
            `You have an invitation to join "${inv.team_name || "a team"}"`,
            {
              duration: 0,
              dropdown: {
                items: [
                  {
                    title: inv.team_name || t("common.team"),
                    subtitle: inv.event_name || t("common.event"),
                    accept: true,
                    deny: true,
                    id: inv.id_invitation,
                    teamId: inv.id_team,
                  },
                ],
                onAccept: async (item) => {
                  toast.remove();
                  try {
                    await acceptInvitation(item.id);
                    toast.success(
                        t("invite.accepted") ?? "Accepted!",
                        t("invite.joinedTeam") ?? "You joined the team.",
                    );
                    window.location.hash = "#/coder";
                  } catch (err) {
                    toast.error(
                        t("common.errorTitle"),
                        err?.message ?? t("common.error"),
                    );
                  }
                },
                onDeny: async (item) => {
                  toast.remove();
                  try {
                    await rejectInvitation(item.id);
                    toast.info(
                        t("invite.declined") ?? "Declined",
                        t("invite.rejected") ?? "You rejected the invitation.",
                    );
                  } catch (err) {
                    toast.error(
                        t("common.errorTitle"),
                        err?.message ?? t("common.error"),
                    );
                  }
                },
              },
            },
        );
      }
    } catch (e) {
      console.error("Error checking invitations:", e);
    }

    this.isLoading = false;
    this.render();
    this._attachHandlers();
    this.navbar.attachEventHandlers();
    if (!this._offLangChange) {
      this._offLangChange = onLangChange(() => this.render());
    }
  }

  render() {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = this._html();
  }

  _html() {
    const isTL = [
      "TL_DEVELOPMENT",
      "TL_SOFT_SKILLS",
      "TL_ENGLISH",
      "ADMIN",
    ].includes(this.user?.role);
    return `
      ${this.navbar.render()}
      <div class="container p-4 d-flex flex-column align-items-center">
        <div class="ces-bg-grid"></div>
        <div class="ces-content">
          <header class="ces-header">
            <div class="ces-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <h1 class="ces-title">${t("ces.title")}</h1>
            <p class="ces-subtitle">
              ${t("ces.welcome", { name: this.user?.name?.split(" ")[0] ?? "there" })}
              ${isTL ? t("ces.subtitleTL") : t("ces.subtitleCoder")}
            </p>
          </header>
          <div class="row g-4 align-items-stretch">
            ${this.isLoading ? this._renderSkeletons() : this._renderEvents()}
          </div>
          ${this.error ? `<p class="ces-error">${this.error}</p>` : ""}
        </div>
      </div>
    `;
  }

  _renderSkeletons() {
    return Array.from(
        { length: 3 },
        () => `
      <div class="ces-event-card ces-skeleton">
        <div class="ces-sk-badge"></div>
        <div class="ces-sk-title"></div>
        <div class="ces-sk-line"></div>
        <div class="ces-sk-line short"></div>
        <div class="ces-sk-footer">
          <div class="ces-sk-pill"></div>
          <div class="ces-sk-btn"></div>
        </div>
      </div>
    `,
    ).join("");
  }

  _renderEvents() {
    if (this.events.length === 0) {
      return `
        <div class="ces-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>${t("ces.noEvents")}</p>
          <span>${t("ces.noEventsHint") ?? "Check back later or contact your administrator."}</span>
        </div>
      `;
    }
    return this.events
        .map((event, i) => this._renderEventCard(event, i))
        .join("");
  }

  _renderEventCard(event, index) {
    const fmt = (d) =>
        d
            ? new Date(d).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
            : t("events.tbd");
    const startDate = fmt(event.date);
    const endDate = fmt(event.end_date);
    const isExpired = event.end_date && new Date(event.end_date) < new Date();

    const typeColors = {
      CAPSTONE: { bg: "#f0f2ff", color: "#6b5cff", label: "Capstone" },
      HACKATHON: { bg: "#fff0f6", color: "#e91e8c", label: "Hackathon" },
      WORKSHOP: { bg: "#f0fdf4", color: "#16a34a", label: "Workshop" },
    };
    const typeStyle = typeColors[event.event_type] ?? {
      bg: "#f4f6f9",
      color: "#6b7a99",
      label: event.event_type,
    };
    const isTL = [
      "TL_DEVELOPMENT",
      "TL_SOFT_SKILLS",
      "TL_ENGLISH",
      "ADMIN",
    ].includes(this.user?.role);

    return `
    <div class="col-12 col-md-6 col-lg-4">
      <article class="ces-event-card h-100" data-event-id="${event.id}" style="--delay: ${index * 80}ms">
        <div class="ces-event-top">
          <span class="ces-event-type" style="background:${typeStyle.bg};color:${typeStyle.color}">
            ${typeStyle.label}
          </span>
          ${event.github_org
        ? `
            <span class="ces-event-org">
              <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              ${event.github_org}
            </span>`
        : ""
    }
        </div>
        <h2 class="ces-event-name">${event.title}</h2>
        <p class="ces-event-desc">${event.description || t("common.noDescription")}</p>
        <div class="ces-event-meta mt-auto">
          <div class="ces-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>${startDate} → ${endDate}</span>
          </div>
          ${event.max_team_size
        ? `
            <div class="ces-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
              </svg>
              <span>${t("ces.upTo")} ${event.max_team_size} ${t("ces.perTeam")}</span>
            </div>`
        : ""
    }
        </div>
        ${isTL
            ? `<button class="ces-btn-join" data-event-id="${event.id}" data-event-title="${event.title}">
            ${t("ces.review") ?? "Review this event"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>`
            : isExpired
                ? `<div class="ces-expired-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Evento finalizado
            </div>`
                : `<button class="ces-btn-join" data-event-id="${event.id}" data-event-title="${event.title}">
              ${t("ces.select") ?? "Join this event"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>`
        }
      </article>
    </div>`;
  }

  _attachHandlers() {
    const TL_ROLES = [
      "TL_DEVELOPMENT",
      "TL_SOFT_SKILLS",
      "TL_ENGLISH",
      "ADMIN",
    ];
    document.querySelectorAll(".ces-btn-join").forEach((btn) => {
      btn.addEventListener("click", () => {
        const eventId = parseInt(btn.dataset.eventId);
        const event = this.events.find((e) => e.id === eventId);
        sessionStorage.setItem("selectedEvent", JSON.stringify(event));

        // Also sync with localStorage for header/breadcrumbs consistency
        if (event) {
          localStorage.setItem("currentEventId", event.id);
          localStorage.setItem("currentEventName", event.title || event.name);
        }

        const destination = TL_ROLES.includes(this.user?.role)
            ? "tlDashboard"
            : "coderHome";
        this.app.navigate(destination, { selectedEvent: event });
      });
    });
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
