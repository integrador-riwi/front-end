import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import { apiFetch } from "../services/api.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/ranking.css";

const isAdmin = (user) => user?.role === "ADMIN";

export default class Ranking {
  constructor(router) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);

    this.events = [];
    this.selectedEventId = null;
    this.rankingStatus = null; // status info for admin
    this.rankingData = null; // published ranking
    this.loadingEvents = true;
    this.loadingRanking = false;
    this.publishing = false;
    this.error = null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0">
        ${this.header.render()}
        <main class="dashboard-main">
          <div class="rk-page" id="rk-root"></div>
        </main>
      </div>
    `;
    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();
    this.navbar.attachEventHandlers();
    await this._loadEvents();
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  async _loadEvents() {
    this.loadingEvents = true;
    this._paint();
    try {
      const res = await apiFetch("/events", { method: "GET" });
      this.events = res?.data?.events ?? res?.data ?? [];
    } catch (e) {
      this.error = "No se pudieron cargar los eventos.";
    }
    this.loadingEvents = false;
    this._paint();
  }

  async _selectEvent(eventId) {
    this.selectedEventId = eventId;
    this.rankingData = null;
    this.rankingStatus = null;
    this.error = null;
    this.loadingRanking = true;
    this._paint();

    try {
      if (isAdmin(this.user)) {
        // Admin sees status + existing ranking if any
        const [statusRes, rankingRes] = await Promise.allSettled([
          apiFetch(`/events/${eventId}/ranking-status`, { method: "GET" }),
          apiFetch(`/events/${eventId}/ranking`, { method: "GET" }),
        ]);
        if (statusRes.status === "fulfilled") {
          this.rankingStatus = statusRes.value?.data ?? null;
        }
        if (rankingRes.status === "fulfilled") {
          this.rankingData = rankingRes.value?.data ?? null;
        }
      } else {
        // TL / other roles: just try to read published ranking
        const res = await apiFetch(`/events/${eventId}/ranking`, {
          method: "GET",
        });
        this.rankingData = res?.data ?? null;
      }
    } catch (e) {
      // 404 just means not published yet — not a hard error
      if (!e.message?.includes("404") && !e.status === 404) {
        this.error = e.message ?? "Error al cargar el ranking.";
      }
    }

    this.loadingRanking = false;
    this._paint();
  }

  async _publishRanking() {
    if (!this.selectedEventId || this.publishing) return;
    this.publishing = true;
    this.error = null;
    this._paint();

    try {
      const res = await apiFetch(
        `/events/${this.selectedEventId}/publish-ranking`,
        {
          method: "POST",
        },
      );
      this.rankingData = res?.data ?? null;
      // Refresh status
      const statusRes = await apiFetch(
        `/events/${this.selectedEventId}/ranking-status`,
        {
          method: "GET",
        },
      );
      this.rankingStatus = statusRes?.data ?? null;
    } catch (e) {
      this.error = e.message ?? "Error al publicar el ranking.";
    }

    this.publishing = false;
    this._paint();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _paint() {
    const root = document.getElementById("rk-root");
    if (!root) return;
    root.innerHTML = this._html();
    this._attachHandlers();
  }

  _html() {
    return `
      <div class="rk-layout">
        ${this._renderSidebar()}
        <div class="rk-main">
          ${this._renderMain()}
        </div>
      </div>
    `;
  }

  _renderSidebar() {
    return `
      <aside class="rk-sidebar app-section">
        <h6 class="rk-sidebar-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          Eventos
        </h6>

        ${
          this.loadingEvents
            ? `<div class="rk-sidebar-loading"><span class="rk-spinner"></span></div>`
            : this.events.length === 0
              ? `<p class="rk-sidebar-empty">No hay eventos.</p>`
              : this.events
                  .map(
                    (ev) => `
                <button
                  class="rk-event-btn ${this.selectedEventId == ev.id ? "rk-event-btn--active" : ""}"
                  data-event-id="${ev.id}"
                  type="button">
                  <span class="rk-event-name">${ev.title}</span>
                  <span class="rk-event-status rk-event-status--${(ev.status ?? "").toLowerCase()}">${ev.status ?? ""}</span>
                </button>
              `,
                  )
                  .join("")
        }
      </aside>
    `;
  }

  _renderMain() {
    if (!this.selectedEventId) {
      return `
        <div class="rk-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <p>Selecciona un evento para ver su ranking.</p>
        </div>
      `;
    }

    if (this.loadingRanking) {
      return `<div class="rk-loading"><span class="rk-spinner rk-spinner--lg"></span><p>Cargando...</p></div>`;
    }

    return `
      ${this.error ? `<div class="rk-alert rk-alert--error">${this.error}</div>` : ""}
      ${isAdmin(this.user) && this.rankingStatus ? this._renderStatusPanel() : ""}
      ${this.rankingData ? this._renderRanking() : this._renderNoRanking()}
    `;
  }

  _renderStatusPanel() {
    const s = this.rankingStatus;
    const items = [
      {
        ok: s.isDeadlinePassed,
        label: s.isDeadlinePassed
          ? "Fecha de entrega vencida"
          : `Entrega cierra el ${s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString("es-CO") : "—"}`,
      },
      {
        ok: s.allProjectsEvaluated,
        label: s.allProjectsEvaluated
          ? `Todos los proyectos evaluados (${s.totalProjects}/${s.totalProjects})`
          : `Proyectos evaluados: ${s.fullyEvaluatedProjects} / ${s.totalProjects}`,
      },
    ];

    return `
      <div class="rk-status-panel app-section">
        <div class="rk-status-header">
          <h6 class="rk-status-title">Estado del ranking</h6>
          ${
            s.requiredAreas?.length
              ? `<div class="rk-areas-badges">
                ${s.requiredAreas.map((a) => `<span class="rk-area-badge">${a}</span>`).join("")}
               </div>`
              : ""
          }
        </div>

        <div class="rk-checklist">
          ${items
            .map(
              (it) => `
            <div class="rk-check-item ${it.ok ? "rk-check-item--ok" : "rk-check-item--pending"}">
              ${
                it.ok
                  ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>`
                  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
              }
              <span>${it.label}</span>
            </div>
          `,
            )
            .join("")}
        </div>

        ${
          !s.allProjectsEvaluated && s.projects?.length
            ? `<details class="rk-pending-details">
              <summary>Ver proyectos pendientes</summary>
              <ul class="rk-pending-list">
                ${s.projects
                  .filter((p) => !p.fullyEvaluated)
                  .map(
                    (p) => `
                  <li>
                    <strong>${p.team}</strong>
                    <span class="rk-areas-progress">${p.evaluatedAreaCount}/${p.requiredAreaCount} áreas</span>
                  </li>
                `,
                  )
                  .join("")}
              </ul>
            </details>`
            : ""
        }

        ${
          s.canPublish
            ? `<button class="rk-publish-btn ${this.publishing ? "rk-publish-btn--loading" : ""}" id="rk-publish-btn" type="button" ${this.publishing ? "disabled" : ""}>
              ${
                this.publishing
                  ? `<span class="rk-spinner"></span> Calculando...`
                  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ${this.rankingData ? "Recalcular ranking" : "Publicar ranking"}`
              }
            </button>`
            : `<p class="rk-cannot-publish">Completa las condiciones anteriores para publicar el ranking.</p>`
        }
      </div>
    `;
  }

  _renderNoRanking() {
    return `
      <div class="rk-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <p>${isAdmin(this.user) ? "El ranking aún no ha sido publicado." : "El ranking de este evento no está disponible aún."}</p>
      </div>
    `;
  }

  _renderRanking() {
    const ranking = this.rankingData.ranking ?? [];
    if (!ranking.length) return this._renderNoRanking();

    const top3 = ranking.slice(0, 3);
    const rest = ranking.slice(3);

    const medals = ["🥇", "🥈", "🥉"];
    const medalColors = ["#e6ca52", "#a8b2c0", "#cd7c54"];

    return `
      <div class="rk-content">
        <div class="rk-content-header">
          <h5 class="app-section-header mb-0">Ranking Final</h5>
          ${
            this.rankingData.calculatedAt
              ? `<span class="rk-calc-date">Calculado: ${new Date(this.rankingData.calculatedAt).toLocaleDateString("es-CO", { dateStyle: "medium" })}</span>`
              : ""
          }
        </div>

        <!-- Podium top 3 -->
        <div class="rk-podium">
          ${top3
            .map(
              (team, i) => `
            <div class="rk-podium-card ${i === 0 ? "rk-podium-card--gold" : ""}" style="--medal-color:${medalColors[i]}">
              <div class="rk-podium-medal">${medals[i]}</div>
              <div class="rk-podium-rank">#${i + 1}</div>
              <div class="rk-podium-name">${team.team_name}</div>
              <div class="rk-podium-project">${team.project_name}</div>
              <div class="rk-podium-score">${team.team_score}</div>
              <div class="rk-podium-label">puntos</div>
            </div>
          `,
            )
            .join("")}
        </div>

        <!-- Full table -->
        <div class="app-section rk-table-card">
          <table class="rk-table">
            <thead>
              <tr>
                <th style="width:48px">#</th>
                <th>Equipo</th>
                <th>Proyecto</th>
                <th class="rk-th-score">Score</th>
              </tr>
            </thead>
            <tbody>
              ${ranking
                .map(
                  (team, i) => `
                <tr class="rk-row ${i < 3 ? "rk-row--top" : ""}" data-team="${team.id_team}">
                  <td class="rk-rank-cell">
                    ${
                      i < 3
                        ? `<span class="rk-medal">${medals[i]}</span>`
                        : `<span class="rk-rank-num">${i + 1}</span>`
                    }
                  </td>
                  <td>
                    <strong>${team.team_name}</strong>
                    <div class="rk-member-count">${team.member_count} integrante${team.member_count != 1 ? "s" : ""}</div>
                  </td>
                  <td>
                    <span class="rk-project-name">${team.project_name}</span>
                    ${
                      team.repo_url
                        ? `<a href="${team.repo_url}" target="_blank" class="rk-repo-link">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                          repo
                        </a>`
                        : ""
                    }
                  </td>
                  <td class="rk-score-cell">
                    <div class="rk-score-bar-wrap">
                      <div class="rk-score-bar" style="width:${Math.min(100, (team.team_score / 5) * 100)}%"></div>
                    </div>
                    <span class="rk-score-val">${team.team_score}</span>
                  </td>
                </tr>
                <tr class="rk-members-row" id="members-${team.id_team}" style="display:none">
                  <td colspan="4">
                    <div class="rk-members-grid">
                      ${(team.members ?? [])
                        .map(
                          (m) => `
                        <div class="rk-member-card">
                          ${
                            m.avatar_url
                              ? `<img src="${m.avatar_url}" class="rk-member-avatar" alt="${m.user_name}">`
                              : `<div class="rk-member-avatar rk-member-avatar--fallback">${(m.user_name ?? "?")[0].toUpperCase()}</div>`
                          }
                          <div class="rk-member-info">
                            <span class="rk-member-name">${m.user_name}</span>
                            <span class="rk-member-score">${m.score} pts</span>
                          </div>
                        </div>
                      `,
                        )
                        .join("")}
                    </div>
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  _attachHandlers() {
    // Event selector
    document.querySelectorAll(".rk-event-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._selectEvent(btn.dataset.eventId);
      });
    });

    // Publish button
    document.getElementById("rk-publish-btn")?.addEventListener("click", () => {
      this._publishRanking();
    });

    // Row click → expand members
    document.querySelectorAll(".rk-row[data-team]").forEach((row) => {
      row.addEventListener("click", () => {
        const teamId = row.dataset.team;
        const membersRow = document.getElementById(`members-${teamId}`);
        if (membersRow) {
          const hidden = membersRow.style.display === "none";
          membersRow.style.display = hidden ? "table-row" : "none";
          row.classList.toggle("rk-row--expanded", hidden);
        }
      });
    });
  }
}
