import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header-config.js";
import { getUser } from "../utils/auth.js";
import { apiFetch } from "../services/api.js";
import { toast } from "../components/Toast/index.js";
import { t, onLangChange } from "../utils/i18n.js";
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
    this.eventStatus = localStorage.getItem("currentEventStatus") ?? null;
    this.selectedEventId = this.eventId;
    this.rankingStatus = null;
    this.rankingData = null;
    this.loadingRanking = false;
    this.publishing = false;
    this.confirmPublish = false;
    this.publishWarnings = [];
    this.error = null;
    this.searchTerm = "";
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      ${this.navbar.render()}
      <div class="container p-0 mx-0 mw-100">
        ${this.header.render()}
        <main class="dashboard-main">
          <div class="rk-page" id="rk-root"></div>
        </main>
      </div>
    `;
    this.header.mountBreadcrumb?.();
    this.header.attachEventHandlers?.();
    this.navbar.attachEventHandlers();
    this._offLangChange = onLangChange(() => this.render());

    if (!this.eventId) {
      this.error = t("ranking.noEvent") ?? "No event selected.";
      toast.error(t("common.errorTitle"), this.error);
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
          toast.error(t("common.errorTitle"), this.error);
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
        toast.error(t("common.errorTitle"), this.error);
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
      toast.error(t("common.errorTitle"), this.error);
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
      return `
        <div class="d-flex flex-column align-items-center justify-content-center" style="height: 60vh; gap: 16px;">
          <div class="ce-spinner" style="width: 40px; height: 40px; border-width: 4px; border-color: rgba(107,92,255,0.2); border-top-color: var(--color-primary, #6b5cff);"></div>
          <p class="text-muted fw-medium">Loading Ranking...</p>
        </div>
      `;
    }

    if (this.publishing) {
      return `
        <div class="rk-calculating-state">
          <div class="rk-calc-animation">
            <div class="rk-pulse"></div>
            <div class="rk-gears">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
            </div>
          </div>
          <h2>${t("ranking.calculating") ?? "Recalculating Ranking..."}</h2>
          <p>${t("ranking.calcDesc") ?? "We are processing final scores and rubrics. This won't take long."}</p>
        </div>
      `;
    }

    return `
      <div class="rk-view-container">
        ${this.error ? `<div class="rk-alert rk-alert--error">${this.error}</div>` : ""}
        
        <!-- Premium Header Area -->
        <header class="rk-view-header">
          <div class="rk-view-header-left">
            <h1 class="rk-view-title">${this.eventName}</h1>
            <div class="rk-view-meta">
              ${this.eventStatus === "FINISHED"
        ? `<span class="rk-status-badge" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;">FINISHED</span>`
        : `<span class="rk-status-badge rk-status-badge--active">ACTIVE</span>`
    }
              <span class="rk-view-subtitle">${t("ranking.final") ?? "Leaderboard"}</span>
            </div>
          </div>
          
          <div class="rk-view-header-right">
            <div class="rk-search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input type="text" placeholder="${t("ranking.searchPlaceholder") ?? "Search teams..."}" id="rk-search-input">
            </div>
            ${isAdmin(this.user) && this.rankingStatus ? this._renderAdminActions() : ""}
          </div>
        </header>

        ${isAdmin(this.user) && this.rankingStatus ? this._renderStatusPanel() : ""}
        ${this.rankingData ? this._renderRanking() : this._renderNoRanking()}
      </div>
    `;
  }

  _renderAdminActions() {
    const isFinished = this.eventStatus === "FINISHED";
    return `
      <button
        class="rk-action-btn rk-action-btn--primary ${this.publishing ? "rk-action-btn--loading" : ""} ${isFinished ? "rk-action-btn--disabled" : ""}"
        id="rk-publish-btn"
        type="button"
        ${this.publishing || isFinished ? "disabled" : ""}
        ${isFinished ? `title="${t("ranking.disabledFinished") ?? "El evento está finalizado"}"` : ""}
        style="${isFinished ? "opacity:0.45;cursor:not-allowed;" : ""}"
      >
        ${this.publishing
        ? `<span class="rk-spinner"></span>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`
    }
        <span>${this.rankingData ? (t("ranking.recalculate") ?? "Recalculate Ranking") : (t("ranking.publish") ?? "Publish Ranking")}</span>
      </button>
    `;
  }

  _renderStatusPanel() {
    const s = this.rankingStatus;
    const incompleteProjects = s.projects?.filter((p) => !p.fullyEvaluated) ?? [];
    const totalProjects = s.projects?.length ?? 0;
    const evaluatedProjects = totalProjects - incompleteProjects.length;
    const progress = totalProjects > 0 ? Math.round((evaluatedProjects / totalProjects) * 100) : 0;

    const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:16px;height:16px"><polyline points="20 6 9 17 4 12"/></svg>`;
    const warnIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:16px;height:16px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

    return `
      <div class="rk-insights-panel app-section">
        <div class="rk-insights-grid">
          <!-- Metric 1: Evaluation Progress -->
          <div class="rk-insight-card">
            <div class="rk-card-icon rk-card-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="rk-card-data">
              <span class="rk-card-label">${t("ranking.evalRate") ?? "EVALUATION RATE"}</span>
              <div class="rk-card-main">
                <span class="rk-card-value">${progress}%</span>
                <div class="rk-mini-progress"><div class="rk-mini-bar" style="width:${progress}%"></div></div>
              </div>
            </div>
          </div>

          <!-- Metric 2: Project Status -->
          <div class="rk-insight-card">
            <div class="rk-card-icon ${evaluatedProjects === totalProjects ? "rk-card-icon--green" : "rk-card-icon--orange"}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="rk-card-data">
              <span class="rk-card-label">${t("ranking.projectsEvaluated") ?? "PROJECTS EVALUATED"}</span>
              <div class="rk-card-main">
                <span class="rk-card-value">${evaluatedProjects}</span>
                <span class="rk-card-sub">/ ${totalProjects} ${t("ranking.total") ?? "Total"}</span>
              </div>
            </div>
          </div>

          <!-- Metric 3: Health Status -->
          <div class="rk-insight-card">
            <div class="rk-card-icon ${s.isDeadlinePassed ? "rk-card-icon--green" : "rk-card-icon--warn"}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="rk-card-data">
              <span class="rk-card-label">${t("ranking.deadline") ?? "DEADLINE STATUS"}</span>
              <div class="rk-card-main">
                <span class="rk-card-value">${s.isDeadlinePassed ? (t("ranking.passed") ?? "Passed") : (t("ranking.active") ?? "Active")}</span>
                <span class="rk-card-sub">${s.isDeadlinePassed ? checkIcon : warnIcon}</span>
              </div>
            </div>
          </div>

          <!-- Action Corner -->
          <div class="rk-insight-action">
            ${incompleteProjects.length > 0 ? `
              <button class="rk-btn-outline" id="toggle-incomplete-btn">
                <span>${t("ranking.viewIncomplete") ?? "View Issues"}</span>
                <span class="rk-badge-count">${incompleteProjects.length}</span>
              </button>
            ` : `
              <div class="rk-all-good">
                ${checkIcon}
                <span>${t("ranking.readyToPublish") ?? "Ready to Publish"}</span>
              </div>
            `}
          </div>
        </div>

        <div class="rk-incomplete-drawer" id="incomplete-drawer" style="display:none">
          <div class="rk-drawer-header">
            <h4>${t("ranking.incompleteTeams") ?? "Incomplete Evaluations"}</h4>
            <p>${t("ranking.incompleteDesc") ?? "These teams have missing rubric scores from one or more TLs."}</p>
          </div>
          <ul class="rk-incomplete-list-v2">
            ${incompleteProjects.map(p => `
              <li>
                <div class="p-info">
                  <span class="p-name">${p.team}</span>
                  <span class="p-cohort">${t("ranking.projectsOverview") ?? "Project"}</span>
                </div>
                <div class="p-stat">
                  <div class="p-progress-bar"><div style="width:${Math.round((p.evaluatedAreaCount / p.requiredAreaCount) * 100)}%"></div></div>
                  <span class="p-count">${p.evaluatedAreaCount}/${p.requiredAreaCount} ${t("ranking.areas") ?? "areas"}</span>
                </div>
              </li>
            `).join("")}
          </ul>
        </div>

        ${this.confirmPublish ? `
          <div class="rk-confirm-card">
            <div class="rk-confirm-content">
              <div class="rk-confirm-header">
                <div class="rk-warn-circle">${warnIcon}</div>
                <div>
                  <h3>${t("ranking.warnPublish") ?? "Publish with Warning?"}</h3>
                  <p>${t("ranking.publishWarningDesc") ?? "Some teams are not fully evaluated. This will affect the accuracy of the ranking."}</p>
                </div>
              </div>
              <div class="rk-confirm-actions">
                <button class="rk-btn rk-btn--secondary" id="rk-cancel-confirm-btn">${t("ranking.cancel")}</button>
                <button class="rk-btn rk-btn--danger" id="rk-publish-btn-confirm">${t("ranking.confirmPublishYes")}</button>
              </div>
            </div>
          </div>
        ` : ""}
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
    let ranking = this.rankingData?.ranking ?? [];
    const showPodium = !this.searchTerm;

    // Apply Search Filter
    if (this.searchTerm) {
      ranking = ranking.filter(t =>
          t.team_name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          t.project_name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (!ranking.length) {
      return `
        <div class="rk-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:.3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <p>${t("ranking.noResults") ?? "No teams found matching your search."}</p>
        </div>
      `;
    }

    const maxScore = Math.max(...(this.rankingData?.ranking ?? []).map((t) => parseFloat(t.team_score) || 0), 1);

    const getRankIcon = (originalIndex) => {
      const colors = ["#FFD700", "#C0C0C0", "#CD7F32", "#A5B4FC", "#A5B4FC"];
      const icons = [
        `<svg viewBox="0 0 24 24" fill="none" stroke="${colors[0]}" stroke-width="2" class="rk-icon-rank"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z"/><path d="M19 16v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2"/></svg>`,
        `<svg viewBox="0 0 24 24" fill="none" stroke="${colors[1]}" stroke-width="2" class="rk-icon-rank"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
        `<svg viewBox="0 0 24 24" fill="none" stroke="${colors[2]}" stroke-width="2" class="rk-icon-rank"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
        `<svg viewBox="0 0 24 24" fill="none" stroke="${colors[3]}" stroke-width="2" class="rk-icon-rank"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        `<svg viewBox="0 0 24 24" fill="none" stroke="${colors[4]}" stroke-width="2" class="rk-icon-rank"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      ];
      return icons[originalIndex] || "";
    };

    const podiumOrder = [3, 1, 0, 2, 4];
    const top5Raw = (this.rankingData?.ranking ?? []).slice(0, 5);
    const tableData = showPodium ? ranking.slice(5) : ranking;

    return `
      <div class="rk-content">
        ${showPodium ? `
          <div class="rk-section-header">
            <div class="rk-title-with-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px;color:var(--gold)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <h2 class="rk-section-title">${t("ranking.topPerformers") ?? "Top Performers"}</h2>
            </div>
          </div>
  
          <div class="rk-podium-3d">
            ${podiumOrder.map(idx => {
      const team = top5Raw[idx];
      if (!team) return "";
      const isWinner = idx === 0;
      return `
              <div class="rk-podium-slot rk-podium-slot--rank-${idx + 1} ${isWinner ? "rk-podium-slot--winner" : ""}" data-team="${team.id_team}">
                <div class="rk-podium-card-v2">
                  ${isWinner ? `<div class="rk-winner-badge">${getRankIcon(0)} #1 WINNER</div>` : `<div class="rk-rank-badge">#${idx + 1}</div>`}
                  <div class="rk-team-avatar">
                    ${team.avatar_url ? `<img src="${team.avatar_url}">` : `<div class="avatar-placeholder">${team.team_name[0]}</div>`}
                    ${isWinner ? `<div class="check-mark"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg></div>` : ""}
                  </div>
                  <h3 class="rk-team-name">${team.team_name}</h3>
                  <span class="rk-team-specialty">${team.clan_name || team.clan || "No Clan"}</span>
                  <div class="rk-team-score">${team.team_score}</div>
                  <span class="rk-team-members">${team.member_count} ${t("ranking.members") ?? "Members"}</span>
                  ${team.repo_url ? `
                    <a href="${team.repo_url}" target="_blank" class="rk-repo-circle" onclick="event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                    </a>
                  ` : ""}
                  <div class="rk-card-glow"></div>
                </div>
                <div class="rk-team-flyout" id="flyout-${team.id_team}">
                  <div class="rk-flyout-content">
                    <div class="rk-flyout-header">
                      <strong>${team.team_name}</strong>
                      <span>${team.project_name}</span>
                    </div>
                    <div class="rk-flyout-members">
                      ${(team.members ?? []).map(m => `
                        <div class="rk-flyout-member">
                          ${m.avatar_url ? `<img src="${m.avatar_url}" class="fm-img">` : `<div class="fm-alt">${m.user_name[0]}</div>`}
                          <div class="fm-info">
                            <span class="fm-name">${m.user_name}</span>
                            <span class="fm-score">${m.score} pts</span>
                          </div>
                        </div>
                      `).join("")}
                    </div>
                    <div class="rk-flyout-score-row">
                      <span>Total Score:</span>
                      <strong>${team.team_score}</strong>
                    </div>
                  </div>
                </div>
              </div>`;
    }).join("")}
          </div>
        ` : `
          <div class="rk-search-results-header">
             <h2 class="rk-section-title">Search Results for "${this.searchTerm}"</h2>
             <button class="rk-btn-outline" id="clear-search">Clear Search</button>
          </div>
        `}
 
        <div class="rk-table-container">
          <div class="rk-table-header">
            <h3 class="rk-table-title">${showPodium ? (t("ranking.overallStandings") ?? "Overall Standings") : ""}</h3>
          </div>
 
          <table class="rk-standings-table">
            <thead>
              <tr>
                <th>${t("ranking.thRank") ?? "RANK"}</th>
                <th>${t("ranking.thTeam") ?? "TEAM IDENTITY"}</th>
                <th>${t("ranking.thSpec") ?? "SPECIALIZATION"}</th>
                <th>${t("ranking.thScore") ?? "FINAL SCORE"}</th>
                <th>${t("ranking.thBar") ?? "PERFORMANCE"}</th>
              </tr>
            </thead>
            <tbody>
              ${tableData.map((team) => {
      const realRank = (this.rankingData?.ranking ?? []).indexOf(team) + 1;
      return `
                <tr class="rk-standings-row" data-team="${team.id_team}">
                  <td class="rank-col">#${realRank.toString().padStart(2, '0')}</td>
                  <td class="team-col">
                    <div class="team-cell">
                      <div class="mini-avatar">${team.team_name[0]}</div>
                      <div class="team-info">
                        <strong>${team.team_name}</strong>
                        <span>${team.member_count} members</span>
                      </div>
                    </div>
                    <div class="rk-team-inline-detail" id="detail-${team.id_team}" style="display:none">
                       <div class="rk-detail-header-v2">
                         <span class="rk-detail-label">Members & Performance</span>
                         ${team.repo_url ? `
                           <a href="${team.repo_url}" target="_blank" class="rk-repo-link-v2">
                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                             Repository
                           </a>
                         ` : ""}
                       </div>
                       <div class="rk-members-mini-list">
                         ${(team.members ?? []).map(m => `
                           <div class="mini-member-row">
                             ${m.avatar_url ? `<img src="${m.avatar_url}" class="mm-img">` : `<div class="mm-alt">${m.user_name[0]}</div>`}
                             <span class="mm-name">${m.user_name}</span>
                             <span class="mm-score">${m.score} pts</span>
                           </div>
                         `).join("")}
                       </div>
                    </div>
                  </td>
                  <td class="spec-col"><span class="spec-badge">${team.clan_name || team.clan || "No Clan"}</span></td>
                  <td class="score-col">${team.team_score}</td>
                  <td class="bar-col">
                    <div class="rk-progress-v2">
                      <div class="rk-progress-bar-v2" style="width:${Math.round((parseFloat(team.team_score) / maxScore) * 100)}%"></div>
                    </div>
                  </td>
                </tr>
              `;
    }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Event handlers ─────────────────────────────────────────

  _attachHandlers() {
    document.getElementById("rk-publish-btn")?.addEventListener("click", () => {
      if (this.confirmPublish) {
        this._publishRanking();
      } else {
        this._requestPublish();
      }
    });

    document.getElementById("rk-publish-btn-confirm")?.addEventListener("click", () => {
      this._publishRanking();
    });

    document.getElementById("rk-cancel-confirm-btn")?.addEventListener("click", () => {
      this._cancelConfirm();
    });

    document.getElementById("toggle-incomplete-btn")?.addEventListener("click", () => {
      const drawer = document.getElementById("incomplete-drawer");
      if (drawer) {
        drawer.style.display = drawer.style.display === "none" ? "block" : "none";
      }
    });

    document.querySelectorAll("[data-team]").forEach((row) => {
      row.addEventListener("click", () => {
        const teamId = row.dataset.team;
        if (row.classList.contains("rk-standings-row")) {
          const detail = document.getElementById(`detail-${teamId}`);
          if (detail) {
            const hidden = detail.style.display === "none";
            detail.style.display = hidden ? "block" : "none";
            row.classList.toggle("is-expanded", hidden);
          }
        }
      });

      // Hover for podium
      if (row.classList.contains("rk-podium-slot")) {
        row.addEventListener("mouseenter", () => {
          const flyout = document.getElementById(`flyout-${row.dataset.team}`);
          if (flyout) flyout.style.display = "block";
        });
        row.addEventListener("mouseleave", () => {
          const flyout = document.getElementById(`flyout-${row.dataset.team}`);
          if (flyout) flyout.style.display = "none";
        });
      }
    });

    const searchInput = document.getElementById("rk-search-input");
    if (searchInput) {
      searchInput.value = this.searchTerm;
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        this._paint();
        // Refocus input since _paint re-renders everything
        document.getElementById("rk-search-input").focus();
        // Set cursor to the end
        const val = document.getElementById("rk-search-input").value;
        document.getElementById("rk-search-input").setSelectionRange(val.length, val.length);
      });
    }

    document.getElementById("clear-search")?.addEventListener("click", () => {
      this.searchTerm = "";
      this._paint();
    });
  }

  destroy() {
    if (this._offLangChange) this._offLangChange();
  }
}
