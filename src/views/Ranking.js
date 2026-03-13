import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getUser } from "../utils/auth.js";
import { apiFetch } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import { t } from "../utils/i18n.js";
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

    this.eventId = localStorage.getItem("currentEventId");
    this.eventName = localStorage.getItem("currentEventName") ?? "Ranking";
    this.selectedEventId = this.eventId;
    this.rankingStatus = null;
    this.rankingData = null;
    this.loadingRanking = false;
    this.publishing = false;
    this.confirmPublish = false;
    this.publishWarnings = [];
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

    if (!this.eventId) {
      this.error = t("ranking.noEvent") ?? "No event selected.";
      toast.error("Error", this.error);
      this._paint();
      return;
    }

    await this._loadRanking(this.eventId);
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  async _loadRanking(eventId) {
    this.rankingData = null;
    this.rankingStatus = null;
    this.error = null;
    this.confirmPublish = false;
    this.loadingRanking = true;
    this._paint();

    try {
      if (isAdmin(this.user)) {
        const [statusRes, rankingRes] = await Promise.allSettled([
          apiFetch(`/events/${eventId}/ranking/status`, { method: "GET" }),
          apiFetch(`/events/${eventId}/ranking`, { method: "GET" }),
        ]);
        if (statusRes.status === "fulfilled") {
          this.rankingStatus = statusRes.value?.data ?? null;
        } else {
          this.error = statusRes.reason?.message ?? t("common.error");
          toast.error("Error", this.error);
        }
        if (rankingRes.status === "fulfilled") {
          this.rankingData = rankingRes.value?.data ?? null;
        }
        // 404 on ranking just means not published yet — not an error
      } else {
        const res = await apiFetch(`/events/${eventId}/ranking`, {
          method: "GET",
        });
        this.rankingData = res?.data ?? null;
      }
    } catch (e) {
      const is404 = e.response?.status === 404 || e.message?.includes("404");
      if (!is404) {
        this.error = e.message ?? t("common.error");
        toast.error("Error", this.error);
      }
    }

    this.loadingRanking = false;
    this._paint();
  }

  // ── Publish flow ───────────────────────────────────────────────────────────

  _requestPublish() {
    const s = this.rankingStatus;
    if (s?.hasIncompleteEvaluations && !this.confirmPublish) {
      this.confirmPublish = true;
      this._paint();
      return;
    }
    this._publishRanking();
  }

  _cancelConfirm() {
    this.confirmPublish = false;
    this._paint();
  }

  async _publishRanking() {
    if (!this.selectedEventId || this.publishing) return;
    this.publishing = true;
    this.confirmPublish = false;
    this.error = null;
    this._paint();

    try {
      const res = await apiFetch(
        `/events/${this.selectedEventId}/ranking/publish`,
        { method: "POST" },
      );
      this.rankingData = res?.data ?? null;
      this.publishWarnings = this.rankingData?.warnings ?? [];

      // Refresh status after publish
      const statusRes = await apiFetch(
        `/events/${this.selectedEventId}/ranking/status`,
        { method: "GET" },
      );
      this.rankingStatus = statusRes?.data ?? null;
    } catch (e) {
      this.error = e.message ?? t("common.error");
      toast.error("Error", this.error);
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
      <div class="rk-layout rk-layout--full">
        <div class="rk-main">
          ${this._renderMain()}
        </div>
      </div>
    `;
  }

  _renderMain() {
    if (this.loadingRanking) {
      return `<div class="rk-loading"><span class="rk-spinner rk-spinner--lg"></span><p>Loading...</p></div>`;
    }

    return `
      ${this.error ? `<div class="rk-alert rk-alert--error">${this.error}</div>` : ""}
      ${isAdmin(this.user) && this.rankingStatus ? this._renderStatusPanel() : ""}
      ${this.rankingData ? this._renderRanking() : this._renderNoRanking()}
    `;
  }

  _renderStatusPanel() {
    const s = this.rankingStatus;
    const incompleteProjects =
      s.projects?.filter((p) => !p.fullyEvaluated) ?? [];

    const warnIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0;color:#f59e0b"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0"><polyline points="20 6 9 17 4 12"/></svg>`;
    const errorIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    const items = [
      {
        ok: s.isDeadlinePassed,
        warn: !s.isDeadlinePassed,
        label: s.isDeadlinePassed
          ? (t("ranking.deadlinePassed") ?? "Delivery deadline passed")
          : `Delivery closes on ${s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString("en-US") : "—"}`,
      },
      {
        ok: s.allProjectsEvaluated,
        warn: !s.allProjectsEvaluated,
        label: s.allProjectsEvaluated
          ? `All projects evaluated (${s.totalProjects}/${s.totalProjects})`
          : `Partial evaluation: ${s.fullyEvaluatedProjects} of ${s.totalProjects} projects complete`,
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
            <div class="rk-check-item ${it.ok ? "rk-check-item--ok" : it.warn ? "rk-check-item--warn" : "rk-check-item--pending"}">
              ${it.ok ? checkIcon : it.warn ? warnIcon : errorIcon}
              <span>${it.label}</span>
            </div>
          `,
            )
            .join("")}
        </div>

        ${
          incompleteProjects.length > 0
            ? `
          <details class="rk-pending-details" ${this.confirmPublish ? "open" : ""}>
            <summary>View projects with incomplete evaluation (${incompleteProjects.length})</summary>
            <ul class="rk-pending-list">
              ${incompleteProjects
                .map(
                  (p) => `
                <li>
                  <strong>${p.team}</strong>
                  <span class="rk-areas-progress rk-areas-progress--warn">${p.evaluatedAreaCount}/${p.requiredAreaCount} areas</span>
                </li>
              `,
                )
                .join("")}
            </ul>
          </details>
        `
            : ""
        }

        ${
          this.publishWarnings.length > 0
            ? `
          <div class="rk-alert rk-alert--warn">
            <strong>Ranking published with warnings:</strong>
            <ul style="margin:6px 0 0 0;padding-left:18px">
              ${this.publishWarnings.map((w) => `<li>${w.message}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }

        ${
          this.confirmPublish
            ? `<div class="rk-confirm-panel">
                <div class="rk-confirm-icon">${warnIcon}</div>
                <div class="rk-confirm-body">
                  <p class="rk-confirm-title">¿Publicar con evaluaciones incompletas?</p>
                  <p class="rk-confirm-desc">
                    ${incompleteProjects.length} proyecto${incompleteProjects.length !== 1 ? "s" : ""}
                    no ha${incompleteProjects.length !== 1 ? "n" : ""} sido evaluado${incompleteProjects.length !== 1 ? "s" : ""} en todas las áreas.
                    Los scores se calcularán solo con las áreas que sí tienen evaluación.
                  </p>
                  <div class="rk-confirm-actions">
                    <button class="rk-btn rk-btn--ghost" id="rk-cancel-confirm-btn" type="button">Cancelar</button>
                    <button class="rk-btn rk-btn--danger" id="rk-publish-btn" type="button">
                      Sí, publicar de todos modos
                    </button>
                  </div>
                </div>
              </div>`
            : `<button
                class="rk-publish-btn ${this.publishing ? "rk-publish-btn--loading" : ""} ${s.hasIncompleteEvaluations ? "rk-publish-btn--warn" : ""}"
                id="rk-publish-btn"
                type="button"
                ${this.publishing ? "disabled" : ""}
              >
                ${
                  this.publishing
                    ? `<span class="rk-spinner"></span> ${t("common.loading") ?? "Calculando..."}`
                    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ${this.rankingData ? (t("ranking.recalculate") ?? "Recalculate ranking") : (t("ranking.publish") ?? "Publish ranking")}
                    ${s.hasIncompleteEvaluations ? warnIcon : ""}`
                }
              </button>`
        }
      </div>
    `;
  }

  _renderNoRanking() {
    return `
      <div class="rk-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <p>${isAdmin(this.user) ? (t("ranking.notPublished") ?? "The ranking has not been published yet.") : (t("ranking.notAvailable") ?? "The ranking is not available yet.")}</p>
      </div>
    `;
  }

  _renderRanking() {
    const ranking = this.rankingData.ranking ?? [];
    if (!ranking.length) return this._renderNoRanking();

    const top3 = ranking.slice(0, 3);
    const medals = ["🥇", "🥈", "🥉"];
    const medalColors = ["#e6ca52", "#a8b2c0", "#cd7c54"];

    // Scale bar relative to the top score in this ranking
    const maxScore = Math.max(
      ...ranking.map((t) => parseFloat(t.team_score) || 0),
      1,
    );

    const calcDate = this.rankingData.calculatedAt
      ? new Date(this.rankingData.calculatedAt).toLocaleDateString("en-US", {
          dateStyle: "medium",
        })
      : null;

    return `
      <div class="rk-content">
        <div class="rk-content-header">
          <h5 class="app-section-header mb-0">Final Ranking</h5>
          ${calcDate ? `<span class="rk-calc-date">Calculated: ${calcDate}</span>` : ""}
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
              <div class="rk-podium-label">points</div>
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
                <th>Team</th>
                <th>Project</th>
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
                    <div class="rk-member-count">${team.member_count} member${team.member_count != 1 ? "s" : ""}</div>
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
                      <div class="rk-score-bar" style="width:${Math.round((parseFloat(team.team_score) / maxScore) * 100)}%"></div>
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
    document.getElementById("rk-publish-btn")?.addEventListener("click", () => {
      if (this.confirmPublish) {
        this._publishRanking();
      } else {
        this._requestPublish();
      }
    });

    document
      .getElementById("rk-cancel-confirm-btn")
      ?.addEventListener("click", () => {
        this._cancelConfirm();
      });

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
