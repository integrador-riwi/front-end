import { toast } from "../components/Toast/index.js";
import { uploadToCloudinary } from "../services/upload.js";
import { t } from "../utils/i18n.js";


export function renderCoderTeam({
  user,
  team,
  isLeader = false,
  isTL = false,
  selectedEvent = null,
}) {
  const { name: teamName, members = [], project = null } = team;

  const grade = project?.grade ?? null;
  const dueDate = project?.final_delivery_date ?? "TBD";
  const projectName = project?.name ?? teamName;
  const projectDesc = project?.description ?? t("coderTeam.noDescriptionYet");
  const isSubmitted = !!project?.submitted_at;
  const additionalRepos = normalizeAdditionalRepos(
    team.additionalRepos ?? team.additional_repos ?? team.additional ?? [],
  );

  const deliverables = project
    ? {
      video_url: project.video_url ?? null,
      preview_photo_url: project.preview_photo_url ?? null,
      presentation_url: project.presentation_url ?? null,
      deploy_url: project.deploy_url ?? null,
    }
    : null;

  const repoUrl = project?.repo_url ?? null;
  const canEdit = isLeader && !isSubmitted;
  const isClosed = !!team.closed_at;

  return `
    <div class="container-xl px-3 px-md-4 py-4">
      <div class="row g-4 align-items-start coderteam-container">

        <!-- ══ LEFT COLUMN ══ -->
        <div class="col-12 col-lg-8 d-flex flex-column gap-4">

          <div class="ct-hero-card rounded-4 p-4">
            <h1 class="ct-hero-title mb-1">${projectName}</h1>
            <p class="ct-hero-tagline mb-0">${projectDesc}</p>

            <div class="d-flex flex-wrap gap-4 pt-3 mt-3 ct-stats-divider">

              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">${t("coderTeam.dueDate")}</span>
                <span class="ct-stat-value">Mon, Mar 9 2026</span>
              </div>

              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">${t("coderTeam.repoLink")}</span>
                ${repoUrl
      ? `<a href="${repoUrl}" target="_blank" rel="noopener" class="ct-stat-value ct-repo-link" style="color: var(--color-primary); text-decoration: none;">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;margin-right:4px;">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        ${t("coderTeam.viewRepo")}
                       </a>`
      : `<span class="ct-stat-value" style="opacity: 0.5;">${t("coderTeam.noLink")}</span>`
    }
              </div>

              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">${t("coderTeam.team")}</span>
                <div class="ct-mini-avatars mt-1">
                  ${members
      .slice(0, 3)
      .map(
        (m) => `
                    <div class="ct-mini-avatar">${m.name.charAt(0)}</div>
                  `,
      )
      .join("")}
                  ${members.length > 3
      ? `<div class="ct-mini-avatar ct-mini-more">+${members.length - 3}</div>`
      : ""
    }
                </div>
              </div>

            </div>
          </div>

          <!-- Activity (hidden) -->
          <div class="bg-white rounded-4 p-4 ct-card-shadow d-none">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div class="d-flex align-items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                     style="width:16px;height:16px;flex-shrink:0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <h2 class="ct-section-title mb-0">${t("coderTeam.activity")}</h2>
              </div>
              <a id="downloadBriefBtn" href="#" download="crudactivity-supcrud.md"
                 class="ct-btn-download d-flex align-items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     style="width:13px;height:13px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                ${t("coderTeam.download")}
              </a>
            </div>
            <div id="project-brief-content" class="ct-brief-preview"></div>
          </div>

          <!-- Deliverables -->
          <div class="bg-white rounded-4 p-4 ct-card-shadow">
            <div class="d-flex align-items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                   style="width:16px;height:16px;flex-shrink:0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h2 class="ct-section-title mb-0">${t("coderTeam.deliverables")}</h2>
              <span class="ms-auto ct-deliverables-count" style="font-size:0.78rem;color:var(--text-muted);">
                ${t("coderTeam.submittedCount", { done: deliverableCount(deliverables, repoUrl) })}
              </span>
            </div>
            ${renderDeliverables(deliverables, repoUrl, canEdit, additionalRepos)}

            ${isSubmitted
      ? `
              <div class="d-flex align-items-center gap-2 mt-3 pt-3" style="border-top:1px solid var(--border);">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" style="width:15px;height:15px;flex-shrink:0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span style="font-size:0.82rem;font-weight:600;color:var(--color-success);">${t("coderTeam.projectSubmitted")}</span>
              </div>
            `
      : canEdit
        ? `
              <button id="submitProjectBtn"
                class="btn w-100 mt-3"
                style="background:var(--color-primary);color:#fff;border-radius:10px;font-size:0.875rem;font-weight:600;padding:10px;opacity:0.4;cursor:not-allowed;"
                disabled>
                ${t("coderTeam.submitProject")}
              </button>
            `
        : ""
    }
          </div>


          <!-- Comments -->
          <div class="bg-white rounded-4 p-4 ct-card-shadow">
            <h2 class="ct-section-title d-flex align-items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                   style="width:16px;height:16px;flex-shrink:0">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              ${t("coderTeam.comments")}
            </h2>

            <div class="d-flex gap-3 align-items-start mb-2">
              ${user?.github_avatar_url
      ? `<img src="${user.github_avatar_url}" alt="${user.name}" class="ct-avatar-sm flex-shrink-0" style="border-radius:50%;object-fit:cover;">`
      : `<div class="ct-avatar-sm flex-shrink-0">${user?.name?.charAt(0) ?? "U"}</div>`
    }
              <textarea id="commentInput" class="ct-comment-input flex-grow-1"
                        placeholder="${t("coderTeam.commentPlaceholder")}"></textarea>
            </div>
            <div class="d-flex justify-content-end mb-4 ps-5">
              <button class="ct-btn-post" id="postCommentBtn">${t("coderTeam.postComment")}</button>
            </div>

            <div class="d-flex flex-column gap-3" id="commentsList"></div>
          </div>

            <!-- TL Evaluation Panel -->
            <div class="bg-white rounded-4 p-4 ct-card-shadow d-none" id="tl-evaluation-panel">
            <div class="d-flex align-items-center gap-2 mb-3 border-bottom pb-3" style="border-color: var(--border) !important;">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="width:16px;height:16px;flex-shrink:0">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <h2 class="ct-section-title mb-0">${t("coderTeam.evaluateTeam")}</h2>
            </div>
            <div id="tl-rubrics-container">
              <div class="ct-brief-loading"><span class="ct-spinner"></span></div>
            </div>
            <button
              id="submitEvaluationsBtn"
              class="btn w-100 mt-3 d-none"
              style="background: var(--color-primary); color: #fff; border-radius: 10px; font-size: 0.875rem; font-weight: 600; padding: 10px;">
              ${t("coderTeam.submitEvaluations")}
            </button>
            <div id="eval-feedback" class="mt-2" style="font-size:0.82rem;"></div>
          </div>
            
        </div>

        <!-- ══ RIGHT COLUMN ══ -->
        <div class="col-12 col-lg-4 coderteam-right-col d-flex flex-column gap-4 team-details">
          <div class="bg-white rounded-4 p-4 ct-card-shadow d-flex flex-column" style="max-height:88vh;overflow-y:auto;">
            
            <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3" style="border-color: var(--border) !important;">
                <h2 class="ct-section-title mb-0">${t("coderTeam.projectInfo")}</h2>
                ${isLeader
      ? `
                <button class="btn btn-sm btn-outline-primary d-flex align-items-center gap-2 btn-project-settings" data-route="projectSettings" style="border-color: var(--color-primary); color: var(--color-primary); border-radius: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    ${t("coderTeam.settings")}
                </button>
                `
      : ""
    }
            </div>

            <h2 class="ct-section-title mb-3">${t("coderTeam.projectTeam")}</h2>
            <ul class="list-unstyled d-flex flex-column gap-1 mb-0">
              ${members
      .map(
        (m, i) => `
                <li class="ct-member-item d-flex align-items-center gap-3 rounded-3 px-2 py-2 ct-member-clickable" 
                    data-user-id="${m.id_user}" 
                    style="cursor:pointer; transition: background 0.2s;"
                    onmouseover="this.style.background='rgba(107, 92, 255, 0.05)'"
                    onmouseout="this.style.background='transparent'">
                  ${m.github_avatar_url
            ? `<img src="${m.github_avatar_url}" alt="${m.name}" class="ct-avatar-md flex-shrink-0" style="border-radius:50%;object-fit:cover;">`
            : `<div class="ct-avatar-md ct-avatar-color-${i % 4} flex-shrink-0">${m.name.charAt(0)}</div>`
          }
                  <div class="overflow-hidden">
                    <p class="ct-member-name text-truncate mb-0 fw-bold">${m.name}</p>
                    <p class="ct-member-role mb-0" style="font-size: 0.75rem; opacity: 0.7;">${m.team_role ?? m.role ?? t("coderTeam.member")}</p>
                  </div>
                </li>
              `,
      )
      .join("")}
            </ul>

            ${isLeader && !isSubmitted && !isClosed
      ? `
            <button class="ct-btn-add-member d-flex align-items-center justify-content-center gap-2 w-100 mt-3"
                    id="addMemberBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   style="width:15px;height:15px">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              ${t("coderTeam.addMember")}
            </button>
            `
      : ""
    }

            ${isLeader && isClosed
      ? `
            <div class="ct-team-closed-note mt-3">
              <strong>Equipo cerrado</strong>
              <span>Ya no acepta nuevos participantes.</span>
              <button class="ct-btn-reopen-team mt-2" id="reopenTeamBtn" type="button">
                Reabrir equipo
              </button>
            </div>
            `
      : ""
    }

            ${!isSubmitted && !isLeader
      ? `
            <button class="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 w-100 mt-2"
                    id="leaveTeamBtn" style="border-radius: 10px; font-size: 0.85rem;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   style="width:15px;height:15px">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              ${t("coderTeam.leaveTeam")}
            </button>
            `
      : ""
    }
          </div>

          <!-- Consolidated Member Grades (moved to sidebar) -->
          <div id="member-grades-section"></div>

        </div>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Video embed helpers
// ─────────────────────────────────────────────────────────────

function _getVideoEmbed(url) {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (ytMatch) {
    return { type: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Cloudinary or any direct video file
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes("cloudinary.com")) {
    return { type: "video", src: url };
  }

  return null;
}

function _renderVideoPreview(url) {
  const embed = _getVideoEmbed(url);
  if (!embed) return "";

  if (embed.type === "iframe") {
    return `
      <div class="ct-media-preview ct-video-preview mt-2">
        <iframe
          src="${embed.src}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
    `;
  }

  // Native video (Cloudinary / direct file)
  return `
    <div class="ct-media-preview ct-video-preview mt-2">
      <video controls preload="metadata" style="width:100%;height:100%;display:block;background:#000;">
        <source src="${embed.src}" />
        ${t("coderTeam.browserNoVideo")}
      </video>
    </div>
  `;
}

function _renderImagePreview(url) {
  if (!url) return "";
  return `
    <div class="ct-media-preview ct-image-preview mt-2" style="border-radius:10px;overflow:hidden;max-height:220px;background:var(--bg);">
      <img
        src="${url}"
        alt="${t("coderTeam.imageAlt")}"
        style="width:100%;height:220px;object-fit:cover;display:block;cursor:pointer;"
        onclick="window.open('${url}','_blank')"
        onerror="this.parentElement.style.display='none'"
      />
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Deliverables
// ─────────────────────────────────────────────────────────────
function renderDeliverables(d, repoUrl, canEdit = false, additionalRepos = []) {
  const items = [
    {
      key: "video_url",
      icon: `
        <svg class="ct-del-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
        </svg>`,
      label: t("coderTeam.deliverableVideoEs"),
      desc: t("coderTeam.deliverableVideoDesc"),
      url: d?.video_url ?? null,
      color: "var(--color-accent)",
      hasPreview: true,
      previewType: "video",
      uploadType: "url",
    },
    {
      key: "presentation_url",
      icon: `
        <svg class="ct-del-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
        </svg>`,
      label: t("coderTeam.deliverableVideoEn"),
      desc: t("coderTeam.deliverableVideoDesc"),
      url: d?.presentation_url ?? null,
      color: "var(--color-accent)",
      hasPreview: true,
      previewType: "video",
      uploadType: "url",
    },
    {
      key: "repo_url",
      icon: `
        <svg class="ct-del-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
        </svg>`,
      label: t("coderTeam.deliverableRepo"),
      desc: t("coderTeam.deliverableRepoDesc"),
      url: repoUrl,
      color: "var(--color-success)",
      hasPreview: false,
      previewType: null,
      uploadType: "readonly",
      additionalRepos,
    },
    {
      key: "preview_photo_url",
      icon: `
        <svg class="ct-del-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>`,
      label: t("coderTeam.deliverablePhoto"),
      desc: t("coderTeam.deliverablePhotoDesc"),
      url: d?.preview_photo_url ?? null,
      color: "var(--gold)",
      hasPreview: true,
      previewType: "image",
      uploadType: "cloudinary",
    },
    {
      key: "deploy_url",
      icon: `
        <svg class="ct-del-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>`,
      label: t("coderTeam.deliverableDeploy"),
      desc: t("coderTeam.deliverableDeployDesc"),
      url: d?.deploy_url ?? null,
      color: "var(--color-primary)",
      hasPreview: false,
      previewType: null,
      uploadType: "url",
    },
  ];

  return `
    <div class="d-flex flex-column gap-2">
      ${items
      .map(
        (item) => `
        <div class="d-flex flex-column rounded-3 ct-deliverable-item ${item.url ? "ct-deliverable-done" : "ct-deliverable-pending"}"
             data-field="${item.key}">

          <!-- Row: icon + label + actions -->
          <div class="d-flex align-items-center justify-content-between gap-3 px-3 py-3">

            <!-- Left: icon + label -->
            <div class="d-flex align-items-center gap-3 overflow-hidden flex-grow-1 flex-shrink-1 min-w-0">
              <div class="ct-del-icon flex-shrink-0"
                   style="background:${item.color}22; color:${item.color}">
                ${item.icon}
              </div>
              <div class="overflow-hidden">
                <span class="ct-del-label d-block text-truncate">${item.label}</span>
                ${item.desc ? `<span class="d-block text-muted mb-1" style="font-size: 0.75rem; white-space: normal; line-height: 1.3;">${item.desc}</span>` : ""}
                ${item.url && item.key === "repo_url"
            ? `
                  <a href="${item.url}" target="_blank" rel="noopener"
                     class="ct-del-status ct-status-done text-truncate d-block"
                     style="max-width:180px; font-size:0.75rem;">
                    ${escHtml(item.url)}
                  </a>
                `
            : `
                  <span class="ct-del-status ${item.url ? "ct-status-done" : "ct-status-pending"}">
                    ${item.url ? t("coderTeam.submitted") : t("coderTeam.pending")}
                  </span>
                `
          }
              </div>
            </div>

            <!-- Right: actions -->
            <div class="ct-deliverable-actions d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
              ${item.url
            ? `
                <a href="${item.url}" target="_blank" rel="noopener" class="ct-btn-open">${t("coderTeam.open")}</a>
                ${canEdit && item.key !== "repo_url"
              ? `
                  <button class="ct-btn-icon ct-btn-edit" data-field="${item.key}" title="${t("coderTeam.edit")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                `
              : ""
            }
              `
            : canEdit
              ? _renderUploadControl(item)
              : ""
          }

              <!-- Edit row hidden by default (leader only, not shown for repo) -->
              ${canEdit && item.key !== "repo_url"
            ? `
                <div class="d-none ct-edit-row w-100" id="edit-${item.key}">
                  ${_renderEditControl(item)}
                </div>
              `
            : ""
          }
            </div>

          </div>

          ${item.key === "repo_url" && item.additionalRepos?.length
            ? renderAdditionalRepos(item.additionalRepos)
            : ""
          }

          <!-- Media previews (shown below the row) -->
          ${item.url && item.hasPreview && item.previewType === "video" ? `<div class="px-3 pb-3">${_renderVideoPreview(item.url)}</div>` : ""}
          ${item.url && item.hasPreview && item.previewType === "image" ? `<div class="px-3 pb-3">${_renderImagePreview(item.url)}</div>` : ""}

        </div>
      `,
      )
      .join("")}
    </div>
  `;
}

function normalizeAdditionalRepos(repos) {
  if (!Array.isArray(repos)) return [];
  return repos
    .map((repo) => ({
      id: repo.id_repo ?? repo.id ?? repo.repo_name ?? repo.label,
      label: repo.label || repo.repo_name || "Additional repo",
      repoName: repo.repo_name || repo.label || "repository",
      url: repo.repo_url || null,
    }))
    .filter((repo) => repo.url || repo.repoName || repo.label);
}

function renderAdditionalRepos(repos) {
  return `
    <div class="ct-additional-repos px-3 pb-3">
      <div class="ct-additional-repos-header">
        <span>Additional repositories</span>
        <small>${repos.length}</small>
      </div>
      <div class="ct-additional-repos-grid">
        ${repos.map((repo) => {
    const label = repo.label || repo.repoName;
    const title = repo.repoName && repo.repoName !== label ? repo.repoName : label;
    return repo.url
      ? `
              <a href="${escAttr(repo.url)}" target="_blank" rel="noopener" class="ct-additional-repo-chip" title="${escAttr(title)}">
                ${repoIcon()}
                <span>
                  <strong>${escHtml(label)}</strong>
                  <small>${escHtml(compactRepoUrl(repo.url))}</small>
                </span>
              </a>
            `
      : `
              <span class="ct-additional-repo-chip ct-additional-repo-chip-muted" title="${escAttr(title)}">
                ${repoIcon()}
                <span>
                  <strong>${escHtml(label)}</strong>
                  <small>Pending link</small>
                </span>
              </span>
            `;
  }).join("")}
      </div>
    </div>
  `;
}

function repoIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 18l6-6-6-6"/>
      <path d="M8 6l-6 6 6 6"/>
    </svg>
  `;
}

function compactRepoUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(value) {
  return escHtml(value).replace(/'/g, "&#39;");
}

// Render the appropriate upload control for pending state
function _renderUploadControl(item) {
  if (item.uploadType === "cloudinary") {
    return `
      <label class="ct-btn-upload-styled" title="${t("coderTeam.uploadImage")}">
        <i class="bi bi-cloud-arrow-up"></i>
        <span>${t("coderTeam.uploadPhoto")}</span>
        <input type="file" class="ct-cloudinary-input d-none" data-field="${item.key}" accept="image/*" />
      </label>
    `;
  }

  if (item.uploadType === "both") {
    return `
      <div class="ct-video-input-group w-100" data-field="${item.key}">
        <div class="ct-video-tabs d-flex gap-1 mb-3">
          <button type="button" class="ct-video-tab active" data-tab="url">
            <i class="bi bi-link-45deg"></i> URL
          </button>
          <button type="button" class="ct-video-tab" data-tab="file">
            <i class="bi bi-upload"></i> ${t("coderTeam.upload")}
          </button>
        </div>
        <div class="ct-video-panel ct-video-panel-url d-flex align-items-center gap-2">
          <div class="ct-edit-input-group">
            <input type="url" class="ct-edit-input ct-url-input" data-field="${item.key}" placeholder="${t("coderTeam.pasteVideoUrl")}" />
            <div class="ct-edit-actions">
              <button class="ct-btn-save-edit ct-btn-submit" data-field="${item.key}" title="${t("coderTeam.save")}">
                <i class="bi bi-check-lg"></i> ${t("coderTeam.send")}
              </button>
            </div>
          </div>
        </div>
        <div class="ct-video-panel ct-video-panel-file d-none">
          <label class="ct-btn-upload-styled">
            <i class="bi bi-camera-video"></i>
            <span>${t("coderTeam.chooseVideoFile")}</span>
            <input type="file" class="ct-cloudinary-input d-none" data-field="${item.key}" accept="video/*" />
          </label>
          <p class="text-center mt-2 mb-0" style="font-size:0.7rem;color:var(--text-muted);">${t("coderTeam.supportedVideo")}</p>
        </div>
      </div>
    `;
  }

  // Default: URL input
  return `
    <div class="ct-edit-input-group">
      <input type="url" class="ct-url-input" data-field="${item.key}" placeholder="${t("coderTeam.pasteUrl")}" />
      <div class="ct-edit-actions">
        <button class="ct-btn-save-edit ct-btn-submit" data-field="${item.key}">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>
    </div>
  `;
}

// Render the edit control (shown when user clicks the edit pencil button)
function _renderEditControl(item) {
  if (item.uploadType === "cloudinary") {
    return `
      <div class="p-3 w-100">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${t("coderTeam.editPhoto")}</span>
          <button class="ct-btn-cancel-edit ct-edit-cancel" data-field="${item.key}"><i class="bi bi-x-lg"></i></button>
        </div>
        <label class="ct-btn-upload-styled w-100">
          <i class="bi bi-image-fill"></i>
          <span>${t("coderTeam.replaceImage")}</span>
          <input type="file" class="ct-cloudinary-input ct-edit-cloudinary-input d-none" data-field="${item.key}" accept="image/*" />
        </label>
      </div>
    `;
  }

  if (item.uploadType === "both") {
    return `
      <div class="ct-video-input-group w-100 p-3" data-field="${item.key}">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div class="ct-video-tabs d-flex gap-1">
            <button type="button" class="ct-video-tab active" data-tab="url"><i class="bi bi-link-45deg"></i> URL</button>
            <button type="button" class="ct-video-tab" data-tab="file"><i class="bi bi-upload"></i> ${t("coderTeam.file")}</button>
          </div>
          <button class="ct-btn-cancel-edit ct-edit-cancel" data-field="${item.key}"><i class="bi bi-x-lg"></i></button>
        </div>
        
        <div class="ct-video-panel ct-video-panel-url d-flex align-items-center gap-2">
          <div class="ct-edit-input-group">
            <input type="url" class="ct-edit-input ct-url-input ct-edit-input" data-field="${item.key}"
                   value="${item.url ?? ""}" placeholder="${t("coderTeam.pasteVideo")}" />
            <div class="ct-edit-actions">
              <button class="ct-btn-save-edit ct-edit-submit" data-field="${item.key}">
                <i class="bi bi-check-lg"></i> ${t("coderTeam.save")}
              </button>
            </div>
          </div>
        </div>
        <div class="ct-video-panel ct-video-panel-file d-none">
          <label class="ct-btn-upload-styled">
            <i class="bi bi-camera-video"></i>
            <span>${t("coderTeam.chooseVideoFile")}</span>
            <input type="file" class="ct-cloudinary-input ct-edit-cloudinary-input d-none" data-field="${item.key}" accept="video/*" />
          </label>
        </div>
      </div>
    `;
  }

  return `
    <div class="p-3 w-100">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">${t("coderTeam.updateItem", { label: item.label })}</span>
        <button class="ct-btn-cancel-edit ct-edit-cancel" data-field="${item.key}"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="ct-edit-input-group">
        <input type="url" class="ct-edit-input ct-url-input ct-edit-input" data-field="${item.key}"
               value="${item.url ?? ""}" placeholder="${t("coderTeam.enterNewUrl")}" />
        <div class="ct-edit-actions">
          <button class="ct-btn-save-edit ct-edit-submit" data-field="${item.key}">
            <i class="bi bi-check-lg"></i> ${t("coderTeam.save")}
          </button>
        </div>
      </div>
      <button class="ct-edit-cancel" data-field="${item.key}">${t("coderTeam.cancel")}</button>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Comment renderers
// ─────────────────────────────────────────────────────────────

function _formatCommentTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("coderTeam.justNow");
  if (diffMin < 60) return t("coderTeam.minutesAgo", { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("coderTeam.hoursAgo", { count: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return t("coderTeam.daysAgo", { count: diffD });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function _renderReply(reply, currentUserId) {
  const isOwner = reply.author_user_id === currentUserId;
  const initial = reply.author_name?.charAt(0)?.toUpperCase() ?? "?";
  const time = _formatCommentTime(reply.creationdate);
  const avatarHtml = reply.author_avatar
    ? `<img src="${reply.author_avatar}" alt="${reply.author_name}" class="ct-avatar-sm flex-shrink-0" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`
    : `<div class="ct-avatar-sm flex-shrink-0" style="width:28px;height:28px;font-size:0.7rem;">${initial}</div>`;
  return `
    <div class="d-flex gap-2 ct-comment ct-reply" data-comment-id="${reply.id_comment}">
      ${avatarHtml}
      <div class="flex-grow-1">
        <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
          <div class="d-flex align-items-center gap-2">
            <span class="ct-comment-author">${reply.author_name ?? t("coderTeam.unknown")}</span>
            <span class="ct-comment-time">${time}</span>
          </div>
          ${isOwner
      ? `
            <button class="ct-btn-delete-comment" data-comment-id="${reply.id_comment}" title="${t("coderTeam.deleteReply")}"
              style="background:none;border:none;cursor:pointer;color:#ccc;font-size:0.75rem;padding:2px 6px;border-radius:6px;transition:color 0.15s;">✕</button>
          `
      : ""
    }
        </div>
        <p class="ct-comment-text mb-0">${reply.comment}</p>
      </div>
    </div>
  `;
}

function _renderComment(comment, currentUserId) {
  const isOwner = comment.author_user_id === currentUserId;
  const initial = comment.author_name?.charAt(0)?.toUpperCase() ?? "?";
  const time = _formatCommentTime(comment.creationdate);
  const replies = comment.replies ?? [];
  const avatarHtml = comment.author_avatar
    ? `<img src="${comment.author_avatar}" alt="${comment.author_name}" class="ct-avatar-sm flex-shrink-0" style="border-radius:50%;object-fit:cover;">`
    : `<div class="ct-avatar-sm flex-shrink-0">${initial}</div>`;

  return `
    <div class="ct-comment-thread" data-comment-id="${comment.id_comment}">
      <div class="d-flex gap-3 ct-comment">
        ${avatarHtml}
        <div class="flex-grow-1">
          <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
            <div class="d-flex align-items-center gap-2">
              <span class="ct-comment-author">${comment.author_name ?? t("coderTeam.unknown")}</span>
              <span class="ct-comment-time">${time}</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="ct-btn-reply" data-comment-id="${comment.id_comment}"
                style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem;font-weight:600;padding:2px 6px;border-radius:6px;transition:background 0.15s;">
                ${t("coderTeam.reply")}
              </button>
              ${isOwner
      ? `
                <button class="ct-btn-delete-comment" data-comment-id="${comment.id_comment}" title="${t("coderTeam.deleteComment")}"
                  style="background:none;border:none;cursor:pointer;color:#ccc;font-size:0.75rem;padding:2px 6px;border-radius:6px;transition:color 0.15s;">✕</button>
              `
      : ""
    }
            </div>
          </div>
          <p class="ct-comment-text mb-0">${comment.comment}</p>

          <!-- Reply input (hidden by default) -->
          <div class="ct-reply-box d-none mt-2" id="reply-box-${comment.id_comment}">
            <div class="d-flex gap-2 align-items-start">
              <textarea class="ct-comment-input flex-grow-1" style="min-height:54px;font-size:0.82rem;"
                        placeholder="${t("coderTeam.writeReply")}" id="reply-input-${comment.id_comment}"></textarea>
              <div class="d-flex flex-column gap-1">
                <button class="ct-btn-post ct-btn-post-reply" style="padding:7px 14px;font-size:0.8rem;"
                        data-parent-id="${comment.id_comment}">${t("coderTeam.send")}</button>
                <button class="ct-btn-cancel-reply" data-comment-id="${comment.id_comment}"
                  style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.78rem;text-align:center;">${t("coderTeam.cancel")}</button>
              </div>
            </div>
          </div>

          <!-- Replies -->
          ${replies.length > 0
      ? `
            <div class="d-flex flex-column gap-2 mt-3 ps-2" style="border-left:2px solid var(--border);">
              ${replies.map((r) => _renderReply(r, currentUserId)).join("")}
            </div>
          `
      : ""
    }
        </div>
      </div>
    </div>
  `;
}

export function renderComment({ name, initial, time, text }) {
  return `
    <div class="d-flex gap-3 ct-comment">
      <div class="ct-avatar-sm flex-shrink-0">${initial}</div>
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="ct-comment-author">${name}</span>
          <span class="ct-comment-time">${time}</span>
        </div>
        <p class="ct-comment-text mb-0">${text}</p>
      </div>
    </div>
  `;
}

function deliverableCount(d, repoUrl) {
  const repo = repoUrl ?? d?.repo_url ?? null;
  return [d?.video_url, d?.presentation_url, repo, d?.preview_photo_url, d?.deploy_url].filter(Boolean).length;
}

function gradeClass(g) {
  if (g >= 90) return "ct-grade-excellent";
  if (g >= 75) return "ct-grade-good";
  if (g >= 60) return "ct-grade-average";
  return "ct-grade-low";
}

function gradeLabel(g) {
  if (g >= 90) return t("coderTeam.gradeExcellent");
  if (g >= 75) return t("coderTeam.gradeGood");
  if (g >= 60) return t("coderTeam.gradeAverage");
  return t("coderTeam.gradeBelow");
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === "TBD") return "TBD";
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
}


// ─────────────────────────────────────────────────────────────
// Comments loading
// ─────────────────────────────────────────────────────────────
export async function loadComments(projectId, user) {
  const list = document.getElementById("commentsList");
  const postBtn = document.getElementById("postCommentBtn");
  const input = document.getElementById("commentInput");
  if (!list || !postBtn || !input) return;

  const currentUserId = user?.id_user ?? null;

  const { getComments, postComment, deleteComment } =
    await import("../services/api.js");

  function renderAll(comments) {
    if (comments.length === 0) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:0.875rem;text-align:center;padding:1rem 0;">${t("coderTeam.noComments")}</p>`;
      return;
    }
    list.innerHTML = comments
      .map((c) => _renderComment(c, currentUserId))
      .join("");
    attachListHandlers();
  }

  function setLoading(on) {
    if (on) {
      list.innerHTML = `<div class="ct-brief-loading"><span class="ct-spinner"></span></div>`;
    }
  }

  async function refresh() {
    try {
      const comments = await getComments(projectId);
      renderAll(Array.isArray(comments) ? comments : []);
    } catch {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:0.875rem;">${t("coderTeam.commentsLoadError")}</p>`;
    }
  }

  setLoading(true);
  await refresh();

  const activeBtn = postBtn.cloneNode(true);
  postBtn.replaceWith(activeBtn);
  const activeInput = input.cloneNode(true);
  input.replaceWith(activeInput);

  activeBtn.addEventListener("click", async () => {
    const text = activeInput.value.trim();
    if (!text) return;

    activeBtn.disabled = true;
    activeBtn.textContent = t("coderTeam.posting");

    try {
      await postComment({ projectId, comment: text });
      activeInput.value = "";
      await refresh();
    } catch (err) {
      toast.error(t("common.errorTitle"), err?.message ?? t("coderTeam.postError"));
    } finally {
      activeBtn.disabled = false;
      activeBtn.textContent = t("coderTeam.postComment");
    }
  });

  activeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      activeBtn.click();
    }
  });

  function attachListHandlers() {
    list.querySelectorAll(".ct-btn-reply").forEach((btn) => {
      btn.addEventListener("click", () => {
        const commentId = btn.dataset.commentId;
        const box = document.getElementById(`reply-box-${commentId}`);
        if (!box) return;
        box.classList.toggle("d-none");
        if (!box.classList.contains("d-none")) {
          document.getElementById(`reply-input-${commentId}`)?.focus();
        }
      });
    });

    list.querySelectorAll(".ct-btn-cancel-reply").forEach((btn) => {
      btn.addEventListener("click", () => {
        const commentId = btn.dataset.commentId;
        const box = document.getElementById(`reply-box-${commentId}`);
        if (box) box.classList.add("d-none");
        const replyInput = document.getElementById(`reply-input-${commentId}`);
        if (replyInput) replyInput.value = "";
      });
    });

    list.querySelectorAll(".ct-btn-post-reply").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const parentId = parseInt(btn.dataset.parentId);
        const replyInput = document.getElementById(`reply-input-${parentId}`);
        const text = replyInput?.value?.trim();
        if (!text) return;

        btn.disabled = true;
        btn.textContent = t("coderTeam.sending");

        try {
          await postComment({
            projectId,
            comment: text,
            parentCommentId: parentId,
          });
          await refresh();
        } catch (err) {
          toast.error(t("common.errorTitle"), err?.message ?? t("coderTeam.replyError"));
          btn.disabled = false;
          btn.textContent = t("coderTeam.send");
        }
      });
    });

    list.querySelectorAll(".ct-btn-delete-comment").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const commentId = btn.dataset.commentId;
        if (!confirm(t("coderTeam.deleteCommentConfirm"))) return;

        btn.disabled = true;
        try {
          await deleteComment(commentId);
          await refresh();
        } catch (err) {
          toast.error(t("common.errorTitle"), err?.message ?? t("coderTeam.deleteCommentError"));
          btn.disabled = false;
        }
      });

      btn.addEventListener("mouseenter", () => { btn.style.color = "#ef4444"; });
      btn.addEventListener("mouseleave", () => { btn.style.color = "#ccc"; });
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Project Brief
// ─────────────────────────────────────────────────────────────

export async function loadProjectBrief() {
  const container = document.getElementById("project-brief-content");
  if (!container) return;

  container.innerHTML = `<div class="ct-brief-loading"><span class="ct-spinner"></span></div>`;

  try {
    const response = await fetch("/crudactivity-supcrud.md");
    const md = await response.text();

    container.innerHTML = _renderMarkdown(md);

    const btn = document.getElementById("downloadBriefBtn");
    if (btn) {
      const blob = new Blob([md], { type: "text/markdown" });
      btn.href = URL.createObjectURL(blob);
    }
  } catch (e) {
    container.innerHTML = `<p>${t("coderTeam.activityLoadError")}</p>`;
  }
}

// ─────────────────────────────────────────────────────────────
// Member Grades Panel
// ─────────────────────────────────────────────────────────────

export async function loadMemberGrades(projectId, context = {}) {
  const container = document.getElementById("member-grades-section");
  if (!container) return;

  const { members = [], rubrics = [], existingEvals = [] } = context;

  const AREA_META = {
    DEVELOPMENT: { label: "Dev", short: "DEV", icon: "code", color: "var(--mint)", barClass: "mg-bar-dev" },
    SOFT_SKILLS: { label: "Soft Skills", short: "SOFT", icon: "psychology", color: "var(--coral)", barClass: "mg-bar-soft" },
    ENGLISH: { label: "English", short: "ENG", icon: "language", color: "var(--gold)", barClass: "mg-bar-eng" },
  };
  const AREAS = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"];

  try {
    const { apiFetch } = await import("../services/api.js");
    const res = await apiFetch(`/evaluations/project/${projectId}/results`, { method: "GET" }).catch(() => null);
    let results = res?.data ?? res ?? null;

    let isPending = false;
    let isPartial = false;

    if (!Array.isArray(results) || results.length === 0) {
      if (members.length > 0) {
        isPending = true;
        results = members.filter(m => m.id_user).map(m => ({
          user_name: m.name,
          github_avatar_url: m.github_avatar_url,
          id_user: m.id_user,
          final_score: 0,
          area_scores: []
        }));
      } else {
        container.innerHTML = "";
        return;
      }
    } else {
      // Check if results are partial (missing final_score globally)
      const hasGlobal = results.some(r => r.final_score != null);
      const hasAnyArea = results.some(r => Array.isArray(r.area_scores) && r.area_scores.length > 0);

      if (!hasGlobal) {
        if (hasAnyArea) {
          isPartial = true;
          results = results.map(r => {
            const areaScores = Array.isArray(r.area_scores) ? r.area_scores.filter(a => a.final_score != null) : [];
            const sum = areaScores.reduce((acc, a) => acc + (parseFloat(a.final_score) || 0), 0);
            const avg = areaScores.length > 0 ? sum / areaScores.length : 0;
            return { ...r, final_score: avg, isPartial: true };
          });
        } else {
          isPending = true;
          // Keep placeholder results from members list if possible
          if (results.length === 0 && members.length > 0) {
            results = members.filter(m => m.id_user).map(m => ({
              user_name: m.name, github_avatar_url: m.github_avatar_url, id_user: m.id_user, final_score: 0, area_scores: []
            }));
          }
        }
      }
    }

    // Safeguard: Hide sidebar ONLY if interactive rubrics are visible (active evaluation)
    const rGrid = document.querySelector(".mg-rubrics-grid");
    if (rGrid && rGrid.offsetParent !== null) {
      container.innerHTML = "";
      return;
    }

    const AREA_WEIGHTS = {
      DEVELOPMENT: 0.55,
      ENGLISH: 0.25,
      SOFT_SKILLS: 0.2,
    };

    const teamAreaBreakdown = AREAS.map((area) => {
      const scores = results
        .map((r) => {
          const entry = Array.isArray(r.area_scores)
            ? r.area_scores.find((item) => item.area === area)
            : null;
          return entry?.final_score == null ? null : parseFloat(entry.final_score);
        })
        .filter((score) => score != null && !Number.isNaN(score));
      const countedScores = scores.filter((score) => score !== 0);
      const areaScore = countedScores.length
        ? countedScores.reduce((sum, score) => sum + score, 0) / countedScores.length
        : 0;

      return {
        area,
        score: parseFloat(areaScore.toFixed(2)),
        memberCount: scores.length,
        countedMemberCount: countedScores.length,
        zeroMemberCount: scores.filter((score) => score === 0).length,
      };
    });

    let weightedAreaSum = 0;
    let totalAreaWeight = 0;
    teamAreaBreakdown.forEach((entry) => {
      if (entry.memberCount === 0) return;
      const weight = AREA_WEIGHTS[entry.area] ?? 0;
      weightedAreaSum += entry.score * weight;
      totalAreaWeight += weight;
    });

    const projectGrade = isPending || totalAreaWeight === 0
      ? 0
      : weightedAreaSum / totalAreaWeight;

    // Compute grade tier — uses CSS variables to stay palette-loyal
    const getTier = (g) => {
      if (g >= 90) return { label: t("coderTeam.gradeExcellent"), colorVar: "var(--mint)", bg: "rgba(90,204,164,0.12)", border: "rgba(90,204,164,0.3)", chipClass: "ct-grade-chip ct-grade-excellent", barSuf: "ct-grade-excellent" };
      if (g >= 75) return { label: t("coderTeam.gradeGood"), colorVar: "var(--accent)", bg: "rgba(107,92,255,0.10)", border: "rgba(107,92,255,0.28)", chipClass: "ct-grade-chip ct-grade-good", barSuf: "ct-grade-good" };
      if (g >= 60) return { label: t("coderTeam.gradeAverage"), colorVar: "var(--gold)", bg: "rgba(230,202,82,0.12)", border: "rgba(230,202,82,0.3)", chipClass: "ct-grade-chip ct-grade-average", barSuf: "ct-grade-average" };
      return { label: t("coderTeam.gradeBelowShort"), colorVar: "var(--coral)", bg: "rgba(254,101,79,0.12)", border: "rgba(254,101,79,0.3)", chipClass: "ct-grade-chip ct-grade-low", barSuf: "ct-grade-low" };
    };

    const projTier = getTier(projectGrade);

    const areaSummaryHtml = isPending ? "" : `
      <div class="mg-area-summary">
        ${teamAreaBreakdown.map((entry) => {
          const meta = AREA_META[entry.area];
          return `
            <div class="mg-area-summary-card">
              <span class="mg-area-summary-label">${meta.short}</span>
              <strong>${entry.score.toFixed(1)}</strong>
              <small>${entry.countedMemberCount}/${entry.memberCount} incluidos - ${entry.zeroMemberCount} en 0</small>
            </div>
          `;
        }).join("")}
      </div>
    `;

    // Build members HTML
    const membersHtml = results.map((r, idx) => {
      const areaScores = Array.isArray(r.area_scores) ? r.area_scores : [];
      const globalScore = parseFloat(r.final_score) || 0;
      const memberTier = getTier(globalScore);
      const userId = r.id_user || r.evaluated_user_id;
      const memberId = `mg-member-${userId || idx}`;

      const avatarHtml = r.github_avatar_url
        ? `<img src="${r.github_avatar_url}" alt="${r.user_name}" class="mg-avatar" style="border:2px solid ${memberTier.border};">`
        : `<div class="mg-avatar mg-avatar-fallback" style="background:${memberTier.bg};color:${memberTier.colorVar};border:2px solid ${memberTier.border};">${r.user_name?.charAt(0)?.toUpperCase() ?? "?"}</div>`;

      // Per-area score rows (shown when member is clicked)
      const areaRowsHtml = AREAS.map(area => {
        const meta = AREA_META[area];
        const entry = areaScores.find(a => a.area === area);
        const score = entry ? parseFloat(entry.final_score) : null;
        const pct = score != null ? Math.min(100, Math.round(score)) : null;
        const at = score != null ? getTier(score) : null;

        const feedbackList = Array.isArray(entry?.feedbacks)
          ? entry.feedbacks.filter(Boolean)
          : entry?.feedback ? [entry.feedback] : [];

        const feedbackHtml = feedbackList.length > 0
          ? `<div class="mg-feedbacks">${feedbackList.map(fb => `<p class="mg-feedback-text">"${fb}"</p>`).join("")}</div>`
          : "";

        const delay = idx * 0.1;
        return `
          <div class="mg-area-row" style="animation-delay: ${delay}s; opacity: ${isPending ? 0.5 : 1};">
            <div class="mg-area-header">
              <div class="mg-area-pills">
                <div class="mg-area-icon-wrapper" style="background:color-mix(in srgb, ${meta.color}, transparent 85%);">
                  <span class="material-icons-round mg-area-icon" style="color:${meta.color};">${meta.icon}</span>
                </div>
                <span class="mg-area-label" style="color:var(--navy);">${meta.short}</span>
              </div>
              <div class="mg-area-score-badge" style="background:color-mix(in srgb, ${meta.color}, transparent 85%); color:${meta.color};">
                ${isPending ? "—" : (pct != null ? `${pct}` : "—")}
              </div>
            </div>
            <div class="mg-bar-container">
              <div class="mg-bar-track" style="background:color-mix(in srgb, ${meta.color}, transparent 90%);">
                <div class="mg-bar-fill" style="width:${isPending ? 0 : (pct ?? 0)}%; background:linear-gradient(90deg, ${meta.color}, color-mix(in srgb, ${meta.color}, black 15%));"></div>
              </div>
            </div>
            ${feedbackHtml}
          </div>`;
      }).join("");

      return `
        <div class="mg-member-row" data-target="${memberId}">
          <div class="mg-member-header"
               onmouseover="this.parentElement.style.borderColor='${memberTier.border}';this.parentElement.style.boxShadow='0 4px 18px ${memberTier.bg}'"
               onmouseout="this.parentElement.style.borderColor='var(--border)';this.parentElement.style.boxShadow='none'">
            ${avatarHtml}
            <div class="mg-member-info">
              <div class="mg-member-name">${r.user_name}</div>
            </div>
            <div class="mg-score-badge">
              <span class="mg-score-value" style="color:${isPending ? 'var(--text-dim)' : memberTier.colorVar};">
                ${isPending ? "—" : Math.round(globalScore)}
              </span>
              <span class="mg-score-unit">${t("coderTeam.pts")}</span>
            </div>
            ${isPending ? '' : '<span class="material-icons-round mg-chevron">expand_more</span>'}
          </div>
          <div id="${memberId}" class="mg-expand-panel" style="display:none;">
            ${isPending ? '' : areaRowsHtml}
          </div>
        </div>`;
    }).join("");

    container.innerHTML = `
      <div class="mg-wrapper">
        <div class="ct-hero-card p-4 mb-3" style="border-radius:20px; ${isPending ? 'background: linear-gradient(135deg, #7b7fa8, #181e4b);' : ''}">
          <div style="position:relative;z-index:2;">
            <div class="ct-stat-label mb-1" style="color: rgba(255,255,255,0.8);">${isPending ? t("coderTeam.evaluationPhase") : (isPartial ? t("coderTeam.accumulatedGrade") : t("coderTeam.globalPerformance"))}</div>
            <div class="mg-hero-score-row">
              <span class="mg-hero-score">${isPending ? t("coderTeam.inProgress") : projectGrade.toFixed(1)}</span>
              ${isPending ? '' : '<span class="mg-hero-denom">/100</span>'}
            </div>
            ${isPending ? `
              <div class="mt-3 p-2 rounded-3" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);">
                <div class="d-flex align-items-center gap-2 small text-white">
                  <span class="material-icons-round" style="font-size:1rem;">info</span>
                  <span>${t("coderTeam.waitingEvaluations")}</span>
                </div>
              </div>
            ` : `
              <div class="mg-hero-track mt-3">
                <div class="ct-grade-bar ${projTier.barSuf} mg-hero-fill" style="width:${Math.min(100, projectGrade)}%;"></div>
              </div>
            `}
            <div class="ct-stat-label mt-2" style="color: rgba(255,255,255,0.6);">${t("coderTeam.participants", { count: results.length, plural: results.length !== 1 ? "s" : "" })}</div>
          </div>
        </div>
        ${areaSummaryHtml}
        <div class="mg-members-section">
          <div class="ct-section-title mb-2 px-1">${t("coderTeam.teamPerformance")}</div>
          <div id="mg-members-list">${membersHtml}</div>
        </div>
      </div>
      <style>
        .mg-wrapper { display:flex; flex-direction:column; }
        .mg-hero-score-row { display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; }
        .mg-hero-score { font-size:2.2rem; font-weight:900; color:#fff; letter-spacing:-0.04em; font-family:var(--main-font); line-height:1; }
        .mg-hero-denom { font-size:1rem; font-weight:600; color:rgba(255,255,255,0.45); }
        .mg-hero-track { height:5px; background:rgba(255,255,255,0.12); border-radius:99px; overflow:hidden; }
        .mg-hero-fill  { height:100%; border-radius:99px; transition:width 1.2s cubic-bezier(0.22,1,0.36,1); }
        .mg-area-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:12px; }
        .mg-area-summary-card { border:1px solid var(--border); background:var(--bg-panel); border-radius:12px; padding:10px; }
        .mg-area-summary-label { display:block; color:var(--text-muted); font-size:0.68rem; font-weight:900; text-transform:uppercase; }
        .mg-area-summary-card strong { display:block; color:var(--navy); font-size:1.15rem; font-weight:900; line-height:1.1; margin-top:3px; }
        .mg-area-summary-card small { display:block; color:var(--text-muted); font-size:0.68rem; font-weight:700; line-height:1.25; margin-top:4px; }
        .mg-members-section { display:flex; flex-direction:column; }
        .mg-member-row { cursor:pointer; border-radius:14px; border:1px solid var(--border); background:var(--bg-panel); transition:border-color 0.2s,box-shadow 0.2s; margin-bottom:8px; overflow:hidden; }
        .mg-member-header { display:flex; align-items:center; gap:12px; padding:12px 14px; }
        .mg-avatar { width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0; }
        .mg-avatar-fallback { display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1rem; }
        .mg-member-info { flex:1; min-width:0; }
        .mg-member-name { font-size:0.9rem; font-weight:700; color:var(--navy); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .mg-tier-chip { margin-top:3px; display:inline-block; }
        .mg-score-badge { display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0; }
        .mg-score-value { font-size:1.15rem; font-weight:900; line-height:1; font-family:var(--main-font); }
        .mg-score-unit  { font-size:0.62rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; }
        .mg-chevron { font-size:1.1rem; color:var(--text-muted); transition:transform 0.25s ease; flex-shrink:0; }
        .mg-chevron.open { transform:rotate(180deg); }
        .mg-expand-panel { padding:0 14px 14px; display:flex; flex-direction:column; gap:12px; animation:mg-fade-in 0.3s cubic-bezier(0.23, 1, 0.32, 1) both; }
        .mg-area-row { 
          display:flex; flex-direction:column; gap:12px; padding:12px; border-radius:14px; 
          background:rgba(255,255,255,0.4); border:1px solid rgba(0,0,0,0.03); 
          transition: all 0.25s ease; animation: mg-slide-up 0.4s cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        .mg-area-row:hover { background:rgba(255,255,255,0.7); transform:translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.04); border-color:rgba(0,0,0,0.08); }
        .mg-area-header { display:flex; align-items:center; justify-content:space-between; }
        .mg-area-pills { display:flex; align-items:center; gap:10px; }
        .mg-area-icon-wrapper { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
        .mg-area-icon { font-size:1.05rem !important; }
        .mg-area-label { font-size:0.78rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; }
        .mg-area-score-badge { padding:4px 10px; border-radius:8px; font-size:0.8rem; font-weight:900; font-family:var(--main-font); letter-spacing:-0.01em; }
        .mg-bar-container { position:relative; padding-top:2px; }
        .mg-bar-track { height:8px; border-radius:99px; overflow:hidden; }
        .mg-bar-fill { height:100%; border-radius:99px; transition:width 1.2s cubic-bezier(0.22, 1, 0.36, 1); }
        .mg-feedbacks { display:flex; flex-direction:column; gap:6px; margin-top:4px; padding-left:4px; }
        .mg-feedback-text { 
           font-size:0.74rem; color:var(--text-muted); font-style:italic; line-height:1.5; margin:0; 
           padding:6px 12px; background:rgba(255,255,255,0.5); border-left:2px solid var(--border); border-radius:0 8px 8px 0;
        }
        @keyframes mg-fade-in { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes mg-slide-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .mg-area-icon-wrapper { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
      </style>
    `;

    // Accordion toggle
    container.querySelectorAll(".mg-member-row").forEach(row => {
      row.addEventListener("click", () => {
        const targetId = row.dataset.target;
        const panel = document.getElementById(targetId);
        const chevron = row.querySelector(".mg-chevron");
        if (!panel) return;
        const isOpen = panel.style.display !== "none";
        panel.style.display = isOpen ? "none" : "flex";
        if (chevron) chevron.classList.toggle("open", !isOpen);
      });
    });

    // Wire sidebar clicks to these rows
    attachMemberClickHandlers();

  } catch (err) {
    console.warn(t("coderTeam.gradesUnavailable"), err?.message);
  }
}

function _renderMarkdown(md) {
  let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  h = h.replace(/```[\s\S]*?```/g, (m) => {
    const code = m.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
    return "<pre><code>" + code + "</code></pre>";
  });

  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  h = h.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  h = h.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  h = h.replace(/^---$/gm, "<hr>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*([^\n]+?)\*/g, "<em>$1</em>");
  h = h.replace(/^- (.+)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>.*?<\/li>\n?)+/gs, (m) => "<ul>" + m + "</ul>");
  h = h.replace(/^(?!<[a-zA-Z\/])(.+)$/gm, (line) =>
    line.trim() ? "<p>" + line + "</p>" : "",
  );

  return h;
}

// ─────────────────────────────────────────────────────────────
// TL Evaluation Panel
// ─────────────────────────────────────────────────────────────

export async function loadEvaluationPanel({
  projectId,
  eventId,
  members,
  userRole = null,
}) {
  const display = document.getElementById("tl-evaluation-panel");
  const container = document.getElementById("tl-rubrics-container");
  const submitBtn = document.getElementById("submitEvaluationsBtn");
  if (!container || !submitBtn) return;
  if (userRole !== "CODER") display.classList.remove("d-none");

  const ROLE_AREA_MAP = {
    TL_DEVELOPMENT: "DEVELOPMENT",
    TL_SOFT_SKILLS: "SOFT_SKILLS",
    TL_ENGLISH: "ENGLISH",
  };
  const allowedArea = ROLE_AREA_MAP[userRole] ?? null;

  const {
    getRubricsByEvent,
    submitEvaluations,
    getMyEvaluationsForProject,
    getMyEvaluationSummaryForProject,
    calculateProjectGrades,
    getProjectEvalStatus,
  } = await import("../services/api.js");

  // ── Check blocking rules before rendering the form ────────────────────────
  let evalStatus = null;
  try {
    evalStatus = await getProjectEvalStatus(projectId);
  } catch (_) { }

  const evalsClosed = evalStatus?.evaluations_closed ?? false;
  const alreadySubmitted = evalStatus?.already_submitted ?? false;

  // Evals globally closed, and this TL didn't submit yet → show lock
  if (evalsClosed && !alreadySubmitted) {
    container.innerHTML = `
      <div class="d-flex align-items-center gap-3 p-4 rounded-3 border" style="background:#fff5f5;border-color:#fca5a5!important;">
        <span class="material-icons-round" style="color:#dc2626;font-size:2rem;">lock</span>
        <div>
          <p class="fw-bold mb-0" style="color:#dc2626;">${t("tl.evalsClosedBadge") || "Calificaciones cerradas"}</p>
          <p class="mb-0 small text-muted">${t("tl.evalsClosedDesc") || "El administrador ha cerrado el período de calificación."}</p>
        </div>
      </div>`;
    submitBtn.classList.add("d-none");
    return;
  }

  // rubrics and existingEvals will be fetched below to populate the sidebar grades if finished


  let rubrics = [];
  let existingEvals = [];
  let evaluationSummary = null;

  try {
    [rubrics, existingEvals, evaluationSummary] = await Promise.all([
      getRubricsByEvent(eventId),
      getMyEvaluationsForProject(projectId),
      getMyEvaluationSummaryForProject(projectId).catch(() => null),
    ]);
    if (allowedArea) rubrics = rubrics.filter((r) => r.area === allowedArea);
  } catch (err) {
    container.innerHTML = `<p class="text-muted small">${t("coderTeam.rubricsLoadError")}</p>`;
    return;
  }

  if (!rubrics.length) {
    container.innerHTML = `<p class="text-muted small">${t("coderTeam.noRubrics")}</p>`;
    return;
  }

  const existingMap = {};
  for (const ev of existingEvals) {
    existingMap[`${ev.id_rubric}_${ev.evaluated_user_id}`] = {
      gradeId: ev.id_grade,
      score: ev.score,
      feedback: ev.feedback,
    };
  }

  const evaluableMembers = members.filter((m) => m.id_user);

  // Check if every evaluable member has an evaluation for every rubric in this area
  const isFullyEvaluated = rubrics.length > 0 && evaluableMembers.length > 0 &&
    evaluableMembers.every(m =>
      rubrics.every(r => existingMap[`${r.id_rubric}_${m.id_user}`])
    );

  if (isFullyEvaluated || alreadySubmitted) {
    const summaryAreas = Array.isArray(evaluationSummary?.areas)
      ? evaluationSummary.areas
      : [];
    const visibleAreas = new Set(rubrics.map((rubric) => rubric.area));
    const backendAreaSummary =
      summaryAreas.find((area) => visibleAreas.has(area.area)) ?? summaryAreas[0] ?? null;
    const backendMembers = Array.isArray(evaluationSummary?.members)
      ? evaluationSummary.members.filter((member) => !backendAreaSummary || member.area === backendAreaSummary.area)
      : [];

    const fallbackMemberScores = evaluableMembers.map((m) => {
      const mEvals = existingEvals.filter(ev => ev.evaluated_user_id === m.id_user);
      const mScore = mEvals.reduce((acc, ev) => acc + (parseFloat(ev.score) || 0), 0) / (mEvals.length || 1);
      return { member: m, score: mScore };
    });
    const memberScores = backendMembers.length
      ? backendMembers.map((item) => ({
        member: {
          id_user: item.evaluated_user_id,
          name: item.evaluated_name,
          github_avatar_url: item.github_avatar_url,
        },
        score: parseFloat(item.member_score) || 0,
      }))
      : fallbackMemberScores;
    const countedMemberScores = memberScores.filter((item) => item.score !== 0);
    const totalScore = backendAreaSummary
      ? parseFloat(backendAreaSummary.area_score) || 0
      : countedMemberScores.length
      ? countedMemberScores.reduce((acc, item) => acc + item.score, 0) / countedMemberScores.length
      : 0;
    const includedCount = backendAreaSummary
      ? Number(backendAreaSummary.counted_member_count) || 0
      : countedMemberScores.length;
    const memberCount = backendAreaSummary
      ? Number(backendAreaSummary.member_count) || memberScores.length
      : memberScores.length;

    // Build a small member breakdown list
    const membersBreakdown = memberScores.map(({ member: m, score: mScore }) => {
      return `
         <div class="d-flex align-items-center justify-content-between p-2 mb-2 rounded-3" style="background: rgba(0,0,0,0.03); border: 1px solid var(--border);">
           <div class="d-flex align-items-center gap-2">
             <img src="${m.github_avatar_url || ''}" style="width:24px;height:24px;border-radius:50%;background:#eee;">
             <span class="small fw-bold">${m.name}</span>
           </div>
           <div class="badge rounded-pill" style="background: var(--bg-card); color: var(--color-primary); border: 1px solid var(--border);">${mScore.toFixed(0)} pts</div>
         </div>`;
    }).join("");

    container.innerHTML = `
      <div class="ct-eval-finished-card p-5" style="background: var(--bg-panel); border-radius: 28px; border: 1px dashed var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
        <div class="text-center mb-4">
          <div class="material-icons-round mb-3" style="font-size: 3.5rem; color: var(--mint);">verified</div>
          <h3 class="fw-bold mb-2">${t("coderTeam.evaluationFinished")}</h3>
          <p class="text-muted">${t("coderTeam.evaluationFinishedDesc")}</p>
        </div>
        
        <div class="row align-items-center g-4">
           <div class="col-md-5">
             <div class="p-4 rounded-4 text-center h-100 d-flex flex-column justify-content-center" style="background: var(--bg-card); border: 1px solid var(--border);">
               <div class="small text-muted fw-bold text-uppercase mb-2" style="font-size: 0.65rem; letter-spacing: 0.05em;">${t("coderTeam.areaAverage")}</div>
               <div class="h2 fw-bold mb-0" style="color: var(--color-primary);">${totalScore.toFixed(1)} <small style="font-size: 0.9rem; opacity: 0.6;">/100</small></div>
               <div class="small text-muted mt-2">${includedCount}/${memberCount} miembros incluidos</div>
             </div>
           </div>
           <div class="col-md-7">
             <div class="ps-md-4 border-start">
               <div class="small text-muted fw-bold text-uppercase mb-3" style="font-size: 0.65rem; letter-spacing: 0.05em;">${t("coderTeam.memberBreakdown")}</div>
               ${membersBreakdown}
             </div>
           </div>
        </div>
        
        <p class="mt-4 pt-4 border-top text-center small text-muted">${t("coderTeam.accumulatedNoteHint")}</p>
      </div>`;
    submitBtn.classList.add("d-none");
    loadMemberGrades(projectId, { members: evaluableMembers, rubrics, existingEvals });
    return;
  }

  const _calculateMemberTotal = (memberId) => {
    let total = 0;
    let totalW = 0;
    rubrics.forEach(r => {
      const card = container.querySelector(`.eval-level-card.selected[data-rubric-id="${r.id_rubric}"][data-member-id="${memberId}"]`);
      if (card) {
        const score = parseFloat(card.dataset.score) || 0;
        total += (score / 100) * r.weight;
        totalW += r.weight;
      }
    });

    const final = totalW > 0 ? (total / totalW) * 100 : 0;
    const scoreEl = document.getElementById(`member-score-${memberId}`);
    const barEl = document.getElementById(`member-score-bar-${memberId}`);
    const rounded = Math.round(final);
    if (scoreEl) scoreEl.textContent = rounded;
    if (barEl) barEl.style.width = `${rounded}%`;
  };

  const membersHtml = evaluableMembers.map((member) => {
    const avatar = member.github_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`;

    let initTotal = 0;
    let initW = 0;
    const rubricsHtml = rubrics.map((rubric) => {
      const key = `${rubric.id_rubric}_${member.id_user}`;
      const existing = existingMap[key];
      if (existing) {
        initTotal += (existing.score / 100) * rubric.weight;
        initW += rubric.weight;
      }

      const sortedGrades = [...rubric.grades].sort((a, b) => a.score - b.score);
      const levelsHtml = sortedGrades.map((g) => {
        const isSelected = existing?.gradeId === g.id_grade;
        const color = g.color || (g.score >= 80 ? '#10b981' : g.score >= 50 ? '#f59e0b' : '#ef4444');
        return `
          <div class="eval-level-card ${isSelected ? 'selected' : ''}"
               data-id="${g.id_grade}"
               data-rubric-id="${rubric.id_rubric}"
               data-member-id="${member.id_user}"
               data-score="${g.score}">
            <div class="eval-card-bar" style="background: ${color}"></div>
            <span class="eval-level-badge" style="background: ${color}15; color: ${color}">Puntos: ${g.score}</span>
            <div class="eval-level-name">${g.name || ""}</div>
            <div class="eval-level-desc">${g.description || t("coderTeam.noLevelDescription")}</div>
            <div class="eval-card-footer">
              <span class="eval-card-pts">${t("coderTeam.pts")}: ${g.score}</span>
              <div class="eval-selection-circle"></div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="eval-rubric-section">
          <div class="d-flex justify-content-between align-items-end mb-3">
            <div>
              <h4 class="eval-rubric-title">${rubric.name}</h4>
              <div class="eval-rubric-meta">${rubric.area} • ${t("coderTeam.weight")}: ${rubric.weight}</div>
            </div>
            
          </div>
          <div class="eval-levels-grid">
            ${levelsHtml}
          </div>
          <div class="eval-feedback-box mt-3">
            <textarea class="eval-feedback-textarea"
                      data-rubric-id="${rubric.id_rubric}"
                      data-member-id="${member.id_user}"
                      placeholder="${t("coderTeam.feedbackPlaceholder", { rubric: rubric.name })}">${existing?.feedback ?? ""}</textarea>
            <div class="eval-feedback-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            </div>
          </div>
        </div>
      `;
    }).join("");

    const initScore = initW > 0 ? (initTotal / initW) * 100 : 0;

    return `
      <div class="member-eval-block mb-5">
        <div class="eval-member-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <img src="${avatar}" class="eval-member-avatar" alt="${member.name}">
            <div class="eval-member-info">
              <h4 class="mb-1 fw-bold">${member.name}</h4>
              <span class="eval-role-badge">${member.team_role || t("coderTeam.member")}</span>
            </div>
          </div>
          <div class="eval-score-container">
            <div class="eval-score-label" style="text-align:right;">${t("coderTeam.averageScore")}</div>
            <div class="eval-score-value" style="text-align:right;">
              <span id="member-score-${member.id_user}">${Math.round(initScore)}</span>
              <span class="eval-score-total">/100</span>
            </div>
            <div class="eval-score-bar-track mt-1" style="width:120px;height:5px;background:rgba(0,0,0,0.06);border-radius:99px;overflow:hidden;">
              <div id="member-score-bar-${member.id_user}" 
                   style="height:100%;width:${Math.round(initScore)}%;background:var(--color-primary);border-radius:99px;transition:width 0.4s ease;"></div>
            </div>
          </div>
        </div>
        ${rubricsHtml}
      </div>
    `;
  }).join("");

  container.innerHTML = membersHtml;
  submitBtn.classList.remove("d-none");

  container.querySelectorAll('.eval-level-card').forEach(card => {
    card.addEventListener('click', () => {
      const memberId = card.dataset.memberId;
      const rubricId = card.dataset.rubricId;
      const score = card.dataset.score;

      container.querySelectorAll(`.eval-level-card[data-rubric-id="${rubricId}"][data-member-id="${memberId}"]`)
        .forEach(c => c.classList.remove('selected'));

      card.classList.add('selected');

      const badge = document.getElementById(`pts-badge-${rubricId}-${memberId}`);
      if (badge) badge.textContent = `${t("coderTeam.pts")}: ${score}`;

      _calculateMemberTotal(memberId);
    });
  });

  submitBtn.onclick = async () => {
    const evaluations = [];
    let valid = true;

    evaluableMembers.forEach(m => {
      rubrics.forEach(r => {
        const selectedCard = container.querySelector(`.eval-level-card.selected[data-rubric-id="${r.id_rubric}"][data-member-id="${m.id_user}"]`);
        if (!selectedCard) {
          valid = false;
          return;
        }

        const feedbackInput = container.querySelector(`.eval-feedback-textarea[data-rubric-id="${r.id_rubric}"][data-member-id="${m.id_user}"]`);
        evaluations.push({
          evaluatedUserId: m.id_user,
          gradeId: parseInt(selectedCard.dataset.id),
          feedback: feedbackInput?.value?.trim() || null
        });
      });
    });

    if (!valid) {
      toast.error(t("coderTeam.evaluationIncompleteTitle"), t("coderTeam.evaluationIncompleteMsg"));
      return;
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = t("coderTeam.savingEvaluations");

    try {
      await submitEvaluations(projectId, evaluations);
      try { await calculateProjectGrades(projectId); } catch (_) { }
      toast.success(t("common.successTitle"), t("coderTeam.evaluationsSaved"));

      // Refresh sidebar grades immediately
      loadMemberGrades(projectId, {
        members: evaluableMembers,
        rubrics,
        existingEvals: evaluations.map(ev => ({
          evaluated_user_id: ev.evaluatedUserId,
          id_rubric: ev.gradeId ? rubrics.find(r => r.grades.some(g => g.id_grade === ev.gradeId))?.id_rubric : null,
          score: ev.gradeId ? rubrics.find(r => r.grades.some(g => g.id_grade === ev.gradeId))?.grades.find(g => g.id_grade === ev.gradeId)?.score : 0,
          feedback: ev.feedback
        }))
      });

      submitBtn.textContent = t("coderTeam.updateEvaluations");
    } catch (err) {
      toast.error(t("common.errorTitle"), err?.message ?? t("coderTeam.evaluationsSaveError"));
      submitBtn.textContent = originalText;
    } finally {
      submitBtn.disabled = false;
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Deliverables — init, upload, and media preview management
// ─────────────────────────────────────────────────────────────

export function initDeliverables(projectId) {
  const fieldMap = {
    video_url: "videoUrl",
    presentation_url: "presentationUrl",
    preview_photo_url: "previewPhotoUrl",
    deploy_url: "deployUrl",
  };

  const editableFields = ["video_url", "presentation_url", "preview_photo_url", "deploy_url"];
  const cloudinaryFields = ["preview_photo_url"]; // image upload
  const videoFields = []; // disabled video upload for both pitches

  // ── Save field value to backend ───────────────────────────
  async function saveField(field, url, btnEl) {
    const apiKey = fieldMap[field];
    if (!apiKey) return;

    const original = btnEl?.innerHTML ?? "";
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = `<span class="ct-spinner" style="width:12px;height:12px;border-width:2px;"></span>`;
    }

    try {
      const { apiFetch } = await import("../services/api.js");
      await apiFetch(`/projects/${projectId}/deliverables`, {
        method: "PUT",
        body: { [apiKey]: url || null },
      });

      const row = document.querySelector(`.ct-deliverable-item[data-field="${field}"]`);
      if (row) {
        if (url) {
          row.classList.remove("ct-deliverable-pending");
          row.classList.add("ct-deliverable-done");

          const statusEl = row.querySelector(".ct-del-status");
          if (statusEl) {
            statusEl.className = "ct-del-status ct-status-done";
            statusEl.textContent = t("coderTeam.submitted");
          }

          // Update the actions area with the post-submit controls
          const actionsDiv = row.querySelector(".ct-deliverable-actions");
          if (actionsDiv) {
            const item = {
              key: field,
              url: url,
              label: field === "video_url" ? t("coderTeam.deliverableVideoEs") : field === "presentation_url" ? t("coderTeam.deliverableVideoEn") : field === "preview_photo_url" ? t("coderTeam.deliverablePhoto") : t("coderTeam.deliverableDeploy"),
              uploadType: cloudinaryFields.includes(field) ? "cloudinary" : "url"
            };

            actionsDiv.innerHTML = `
              <div class="d-flex align-items-center gap-2">
                <a href="${url}" target="_blank" rel="noopener" class="ct-btn-open">${t("coderTeam.open")}</a>
                <button class="ct-btn-icon ct-btn-edit" data-field="${field}" title="${t("coderTeam.edit")}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <div class="d-none ct-edit-row" id="edit-${field}">
                ${_renderEditControl(item)}
              </div>
            `;
            attachRowHandlers(actionsDiv);
          }

          // Inject media preview below the row
          _refreshMediaPreview(row, field, url);
        } else {
          row.classList.remove("ct-deliverable-done");
          row.classList.add("ct-deliverable-pending");
          // Remove any existing preview
          row.querySelector(".ct-media-preview")?.remove();
        }
      }

      _refreshDeliverableCount();
    } catch (err) {
      toast.error(t("common.errorTitle"), err?.message ?? t("coderTeam.deliverableSaveError"));
      if (btnEl) {
        btnEl.innerHTML = original;
        btnEl.disabled = false;
      }
    } finally {
      if (btnEl) btnEl.disabled = false;
    }
  }

  // ── Inject or replace a media preview inside the row ─────
  function _refreshMediaPreview(row, field, url) {
    // Remove old preview if present
    row.querySelector(".ct-media-preview")?.remove();

    let previewHtml = "";
    if (field === "video_url") {
      previewHtml = _renderVideoPreview(url);
    } else if (field === "preview_photo_url") {
      previewHtml = _renderImagePreview(url);
    }

    if (previewHtml) {
      const previewWrapper = document.createElement("div");
      previewWrapper.className = "px-3 pb-3";
      previewWrapper.innerHTML = previewHtml;
      row.appendChild(previewWrapper);
    }
  }

  // ── Cloudinary file upload with progress ──────────────────
  async function handleCloudinaryUpload(file, field, triggerEl) {
    if (!file) return;

    const isVideo = videoFields.includes(field);
    const resourceType = isVideo ? "video" : "image";
    const label = triggerEl?.closest("label") || triggerEl;

    const progressId = `upload-progress-${field}`;
    document.getElementById(progressId)?.remove();

    label.insertAdjacentHTML(
      "afterend",
      `<div id="${progressId}" class="mt-2 w-100">
        <div class="d-flex justify-content-between mb-1" style="font-size:0.65rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">
          <span>${t("coderTeam.uploading", { type: isVideo ? t("coderTeam.video") : t("coderTeam.image") })}</span>
          <span id="${progressId}-pct">0%</span>
        </div>
        <div class="progress" style="height: 5px; border-radius: 99px; background:#edf2f7; overflow:hidden;">
          <div id="${progressId}-bar" class="progress-bar progress-bar-animated" role="progressbar" style="width: 0%; background:var(--color-primary); border-radius:99px; transition: width 0.2s;"></div>
        </div>
      </div>`,
    );

    try {
      const url = await uploadToCloudinary(file, resourceType, (pct) => {
        const pctEl = document.getElementById(`${progressId}-pct`);
        const barEl = document.getElementById(`${progressId}-bar`);
        if (pctEl) pctEl.textContent = `${pct}%`;
        if (barEl) barEl.style.width = `${pct}%`;
      });

      document.getElementById(progressId)?.remove();
      await saveField(field, url, null);
      toast.success(t("coderTeam.uploadComplete"), isVideo ? t("coderTeam.videoUploaded") : t("coderTeam.imageUploaded"));
    } catch (err) {
      document.getElementById(progressId)?.remove();
      toast.error(t("coderTeam.uploadFailed"), err?.message ?? t("coderTeam.uploadError"));
    }
  }

  function _refreshDeliverableCount() {
    const badge = document.querySelector(".ct-deliverables-count");
    const done = document.querySelectorAll(".ct-deliverable-done").length;
    if (badge) badge.textContent = t("coderTeam.submittedCount", { done });
    _updateSubmitBtn(done);
  }

  function _updateSubmitBtn(done) {
    const btn = document.getElementById("submitProjectBtn");
    if (!btn) return;
    const allDone = done >= 5;
    btn.disabled = !allDone;
    btn.style.opacity = allDone ? "1" : "0.4";
    btn.style.cursor = allDone ? "pointer" : "not-allowed";
  }

  function _attachSubmitHandler() {
    const btn = document.getElementById("submitProjectBtn");
    if (!btn) return;

    const done = document.querySelectorAll(".ct-deliverable-done").length;
    _updateSubmitBtn(done);

    btn.addEventListener("click", async () => {
      if (
        !confirm(
          t("coderTeam.submitProjectConfirm"),
        )
      )
        return;

      btn.disabled = true;
      btn.textContent = t("coderTeam.submitting");

      try {
        const { submitProject } = await import("../services/api.js");
        await submitProject(projectId);

        btn.insertAdjacentHTML(
          "afterend",
          `
          <div class="d-flex align-items-center gap-2 mt-3 pt-3" style="border-top:1px solid var(--border);">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" style="width:15px;height:15px;flex-shrink:0">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span style="font-size:0.82rem;font-weight:600;color:var(--color-success);">${t("coderTeam.projectSubmitted")}</span>
          </div>
        `,
        );
        btn.remove();

        document
          .querySelectorAll(
            ".ct-btn-edit, .ct-btn-submit, .ct-url-input, .ct-edit-cancel, .ct-btn-upload-label",
          )
          .forEach((el) => {
            el.style.display = "none";
          });

        document.getElementById("addMemberBtn")?.remove();
        document.getElementById("leaveTeamBtn")?.remove();
      } catch (err) {
        toast.error(t("common.errorTitle"), err?.message ?? t("coderTeam.submitProjectError"));
        btn.disabled = false;
        btn.textContent = t("coderTeam.submitProject");
      }
    });
  }

  // ── Attach interaction handlers to a deliverable row ──────
  function attachRowHandlers(scope) {
    // Video tab switching (URL ↔ Upload)
    scope.querySelectorAll(".ct-video-tabs").forEach((tabs) => {
      const group = tabs.closest(".ct-video-input-group");
      if (!group) return;
      tabs.querySelectorAll(".ct-video-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.querySelectorAll(".ct-video-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          const panel = tab.dataset.tab;
          group.querySelector(".ct-video-panel-url").classList.toggle("d-none", panel !== "url");
          group.querySelector(".ct-video-panel-url").classList.toggle("d-flex", panel === "url");
          group.querySelector(".ct-video-panel-file").classList.toggle("d-none", panel !== "file");
        });
      });
    });

    // Submit new URL (pending state — non-cloudinary, non-video-upload)
    scope
      .querySelectorAll(".ct-btn-submit:not(.ct-edit-submit)")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const field = btn.dataset.field;
          if (!editableFields.includes(field) || cloudinaryFields.includes(field)) return;
          const input = scope.querySelector(
            `.ct-url-input:not(.ct-edit-input)[data-field="${field}"]`,
          );
          const url = input?.value?.trim();
          if (!url) { input?.focus(); return; }
          await saveField(field, url, btn);
        });
      });

    // Cloudinary file input (pending state)
    scope.querySelectorAll(".ct-cloudinary-input:not(.ct-edit-cloudinary-input)").forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) handleCloudinaryUpload(file, input.dataset.field, input);
      });
    });

    // Edit button → show edit row
    scope.querySelectorAll(".ct-btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.field;
        const editRow = document.getElementById(`edit-${field}`);
        if (!editRow) return;
        editRow.classList.remove("d-none");
        editRow.classList.add("d-flex");
        editRow.querySelector(".ct-edit-input")?.focus();
      });
    });

    // Cancel edit
    scope.querySelectorAll(".ct-edit-cancel").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.field;
        const editRow = document.getElementById(`edit-${field}`);
        if (editRow) {
          editRow.classList.add("d-none");
          editRow.classList.remove("d-flex");
        }
      });
    });

    // Submit edit (URL fields)
    scope.querySelectorAll(".ct-edit-submit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const field = btn.dataset.field;
        if (!editableFields.includes(field) || cloudinaryFields.includes(field)) return;
        const input = document.querySelector(`.ct-edit-input[data-field="${field}"]`);
        const url = input?.value?.trim();
        if (!url) { input?.focus(); return; }
        await saveField(field, url, btn);
      });
    });

    // Cloudinary edit input (replace image)
    scope.querySelectorAll(".ct-edit-cloudinary-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) handleCloudinaryUpload(file, input.dataset.field, input);
      });
    });
  }

  // Attach to all rows
  document.querySelectorAll(".ct-deliverable-item").forEach((row) => {
    const actionsDiv = row.querySelector(".ct-deliverable-actions");
    if (actionsDiv) attachRowHandlers(actionsDiv);
  });

  _attachSubmitHandler();
}

// ─────────────────────────────────────────────────────────────
// Sidebar Member Click Handler
// ─────────────────────────────────────────────────────────────

export function attachMemberClickHandlers() {
  const sidebarMembers = document.querySelectorAll(".ct-member-clickable");

  sidebarMembers.forEach(item => {
    // Only attach once
    if (item.dataset.clickAttached) return;
    item.dataset.clickAttached = "true";

    item.addEventListener("click", () => {
      const userId = item.dataset.userId;
      if (!userId) return;

      const gradeRow = document.querySelector(`.mg-member-row[data-target="mg-member-${userId}"]`);
      if (!gradeRow) return;

      // Scroll to the grades section
      gradeRow.scrollIntoView({ behavior: "smooth", block: "center" });

      // If it's not already open, click it to expand
      const panel = document.getElementById(`mg-member-${userId}`);
      if (panel && panel.style.display === "none") {
        gradeRow.click();
      }

      // Visual feedback on the row
      gradeRow.style.transition = "background 0.5s";
      const originalBg = gradeRow.style.background || "var(--bg-panel)";
      gradeRow.style.background = "rgba(107, 92, 255, 0.15)";
      setTimeout(() => {
        gradeRow.style.background = originalBg;
      }, 1000);
    });
  });
}
