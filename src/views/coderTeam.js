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
  const projectDesc = project?.description ?? "No description yet.";
  const isSubmitted = !!project?.submitted_at;

  // deliverables come flat on the project object, not nested
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

  return `
    <div class="container-xl px-3 px-md-4 py-4">
      <div class="row g-4 align-items-start coderteam-container">

        <!-- ══ LEFT COLUMN ══ -->
        <div class="col-12 col-lg-8 d-flex flex-column gap-4">

          <!-- Project hero -->
          <div class="ct-hero-card rounded-4 p-4">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              ${
                selectedEvent
                  ? `
              <div class="event-context-badge event-context-badge--sm" id="eventBadgeBack">
                <svg class="back-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                <svg class="event-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>${selectedEvent.title ?? selectedEvent.event_name ?? "Event"}</span>
              </div>
              `
                  : ""
              }
            </div>

            <h1 class="ct-hero-title mb-1">${projectName}</h1>
            <p class="ct-hero-tagline mb-0">${projectDesc}</p>

            <div class="d-flex flex-wrap gap-4 pt-3 mt-3 ct-stats-divider">

              <!-- Grade - hidden for now -->

              <!-- Due date -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Due Date</span>
                <span class="ct-stat-value">Mon, Mar 9 2026</span>
              </div>

              <!-- Repo Link -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Repo Link</span>
                ${
                  repoUrl
                    ? `<a href="${repoUrl}" target="_blank" rel="noopener" class="ct-stat-value ct-repo-link" style="color: var(--color-primary); text-decoration: none;">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;margin-right:4px;">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        View Repo
                       </a>`
                    : `<span class="ct-stat-value" style="opacity: 0.5;">No link</span>`
                }
              </div>

              <!-- Team -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Team</span>
                <div class="ct-mini-avatars mt-1">
                  ${members
                    .slice(0, 3)
                    .map(
                      (m) => `
                    <div class="ct-mini-avatar">${m.name.charAt(0)}</div>
                  `,
                    )
                    .join("")}
                  ${
                    members.length > 3
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
                <h2 class="ct-section-title mb-0">Activity</h2>
              </div>
              <a id="downloadBriefBtn" href="#" download="crudactivity-supcrud.md"
                 class="ct-btn-download d-flex align-items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     style="width:13px;height:13px">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Descargar
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
              <h2 class="ct-section-title mb-0">Deliverables</h2>
              <span class="ms-auto ct-deliverables-count" style="font-size:0.78rem;color:var(--text-muted);">
                ${deliverableCount(deliverables, repoUrl)}/3 submitted
              </span>
            </div>
            ${renderDeliverables(deliverables, repoUrl, canEdit)}

            ${
              isSubmitted
                ? `
              <div class="d-flex align-items-center gap-2 mt-3 pt-3" style="border-top:1px solid var(--border);">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" style="width:15px;height:15px;flex-shrink:0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span style="font-size:0.82rem;font-weight:600;color:var(--color-success);">Project submitted — under review</span>
              </div>
            `
                : canEdit
                  ? `
              <button id="submitProjectBtn"
                class="btn w-100 mt-3"
                style="background:var(--color-primary);color:#fff;border-radius:10px;font-size:0.875rem;font-weight:600;padding:10px;opacity:0.4;cursor:not-allowed;"
                disabled>
                Submit Project
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
              Comments
            </h2>

            <div class="d-flex gap-3 align-items-start mb-2">
              ${
                user?.github_avatar_url
                  ? `<img src="${user.github_avatar_url}" alt="${user.name}" class="ct-avatar-sm flex-shrink-0" style="border-radius:50%;object-fit:cover;">`
                  : `<div class="ct-avatar-sm flex-shrink-0">${user?.name?.charAt(0) ?? "U"}</div>`
              }
              <textarea id="commentInput" class="ct-comment-input flex-grow-1"
                        placeholder="Share your thoughts..."></textarea>
            </div>
            <div class="d-flex justify-content-end mb-4 ps-5">
              <button class="ct-btn-post" id="postCommentBtn">Post Comment</button>
            </div>

            <div class="d-flex flex-column gap-3" id="commentsList"></div>
          </div>
            <!-- TL Evaluation Panel -->
            <div class="bg-white rounded-4 p-4 ct-card-shadow d-none" id="tl-evaluation-panel">
            <div class="d-flex align-items-center gap-2 mb-3 border-bottom pb-3" style="border-color: var(--border) !important;">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="width:16px;height:16px;flex-shrink:0">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <h2 class="ct-section-title mb-0">Evaluate Team</h2>
            </div>
            <div id="tl-rubrics-container">
              <div class="ct-brief-loading"><span class="ct-spinner"></span></div>
            </div>
            <button
              id="submitEvaluationsBtn"
              class="btn w-100 mt-3 d-none"
              style="background: var(--color-primary); color: #fff; border-radius: 10px; font-size: 0.875rem; font-weight: 600; padding: 10px;">
              Submit Evaluations
            </button>
            <div id="eval-feedback" class="mt-2" style="font-size:0.82rem;"></div>
          </div>
            
        </div>

        <!-- ══ RIGHT COLUMN ══ -->
        <div class="col-12 col-lg-4 coderteam-right-col d-flex flex-column gap-4 team-details">
          <div class="bg-white rounded-4 p-4 ct-card-shadow team-details d-flex flex-column">
            
            <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3" style="border-color: var(--border) !important;">
                <h2 class="ct-section-title mb-0">Project Info & Settings</h2>
                ${
                  isLeader
                    ? `
                <button class="btn btn-sm btn-outline-primary d-flex align-items-center gap-2 btn-project-settings" data-route="projectSettings" style="border-color: var(--color-primary); color: var(--color-primary); border-radius: 8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Settings
                </button>
                `
                    : ""
                }
            </div>

            <h2 class="ct-section-title mb-3">Project Team</h2>
            <ul class="list-unstyled d-flex flex-column gap-1 mb-0">
              ${members
                .map(
                  (m, i) => `
                <li class="ct-member-item d-flex align-items-center gap-3 rounded-3 px-2 py-2">
                  ${
                    m.github_avatar_url
                      ? `<img src="${m.github_avatar_url}" alt="${m.name}" class="ct-avatar-md flex-shrink-0" style="border-radius:50%;object-fit:cover;">`
                      : `<div class="ct-avatar-md ct-avatar-color-${i % 4} flex-shrink-0">${m.name.charAt(0)}</div>`
                  }
                  <div class="overflow-hidden">
                    <p class="ct-member-name text-truncate mb-0">${m.name}</p>
                    <p class="ct-member-role mb-0">${m.team_role ?? m.role ?? "Member"}</p>
                  </div>
                </li>
              `,
                )
                .join("")}
            </ul>

            ${
              isLeader && !isSubmitted
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
              Add Member
            </button>
            `
                : ""
            }

            ${
              !isSubmitted
                ? `
            <button class="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 w-100 mt-2"
                    id="leaveTeamBtn" style="border-radius: 10px; font-size: 0.85rem;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   style="width:15px;height:15px">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Leave Team
            </button>
            `
                : ""
            }
          </div>

          ${
            isTL
              ? `
          
          `
              : ""
          }
        </div>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Deliverables
// ─────────────────────────────────────────────────────────────
function renderDeliverables(d, repoUrl, canEdit = false) {
  const items = [
    {
      key: "video_url",
      icon: "",
      label: "Pitch Video",
      url: d?.video_url ?? null,
      color: "var(--color-accent)",
    },
    {
      key: "repo_url",
      icon: "",
      label: "Repository",
      url: repoUrl,
      color: "var(--color-success)",
    },
    {
      key: "preview_photo_url",
      icon: "",
      label: "Preview Photo",
      url: d?.preview_photo_url ?? null,
      color: "var(--color-warning)",
    },
  ];

  return `
    <div class="d-flex flex-column gap-2">
      ${items
        .map(
          (item) => `
        <div class="d-flex align-items-center justify-content-between gap-3 rounded-3 px-3 py-3
                    ct-deliverable-item ${item.url ? "ct-deliverable-done" : "ct-deliverable-pending"}"
             data-field="${item.key}">

          <!-- Left: icon + label -->
          <div class="d-flex align-items-center gap-3 overflow-hidden flex-grow-1 flex-shrink-1 min-w-0">
            <div class="ct-del-icon flex-shrink-0"
                 style="background:${item.color}22; color:${item.color}">
              ${item.icon}
            </div>
            <div class="overflow-hidden">
              <span class="ct-del-label d-block text-truncate">${item.label}</span>
              ${
                item.url && item.key === "repo_url"
                  ? `
                <a href="${item.url}" target="_blank" rel="noopener"
                   class="ct-del-status ct-status-done text-truncate d-block"
                   style="max-width:180px; font-size:0.75rem;">
                  ${item.url}
                </a>
              `
                  : `
                <span class="ct-del-status ${item.url ? "ct-status-done" : "ct-status-pending"}">
                  ${item.url ? "Submitted" : "Pending"}
                </span>
              `
              }
            </div>
          </div>

          <!-- Right: actions -->
          <div class="ct-deliverable-actions d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
            ${
              item.url
                ? `
              <a href="${item.url}" target="_blank" rel="noopener" class="ct-btn-open">Open</a>
              ${
                canEdit && item.key !== "repo_url"
                  ? `
                <button class="ct-btn-icon ct-btn-edit" data-field="${item.key}" title="Edit">
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
                  ? `
              <div class="d-flex align-items-center gap-2">
                <input type="url" class="ct-url-input" data-field="${item.key}" placeholder="Paste URL…" />
                <button class="ct-btn-icon ct-btn-submit" data-field="${item.key}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            `
                  : ""
            }

            <!-- Edit row hidden by default (leader only, not shown for repo) -->
            ${
              canEdit && item.key !== "repo_url"
                ? `
              <div class="d-none align-items-center gap-2 ct-edit-row" id="edit-${item.key}">
                <input type="url" class="ct-url-input ct-edit-input" data-field="${item.key}"
                       value="${item.url ?? ""}" placeholder="New URL…" />
                <button class="ct-btn-icon ct-btn-submit ct-edit-submit" data-field="${item.key}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <button class="ct-btn-cancel ct-edit-cancel" data-field="${item.key}">✕</button>
              </div>
            `
                : ""
            }
          </div>

        </div>
      `,
        )
        .join("")}
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
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
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
            <span class="ct-comment-author">${reply.author_name ?? "Unknown"}</span>
            <span class="ct-comment-time">${time}</span>
          </div>
          ${
            isOwner
              ? `
            <button class="ct-btn-delete-comment" data-comment-id="${reply.id_comment}" title="Delete reply"
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
              <span class="ct-comment-author">${comment.author_name ?? "Unknown"}</span>
              <span class="ct-comment-time">${time}</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <button class="ct-btn-reply" data-comment-id="${comment.id_comment}"
                style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:0.75rem;font-weight:600;padding:2px 6px;border-radius:6px;transition:background 0.15s;">
                Reply
              </button>
              ${
                isOwner
                  ? `
                <button class="ct-btn-delete-comment" data-comment-id="${comment.id_comment}" title="Delete comment"
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
                        placeholder="Write a reply..." id="reply-input-${comment.id_comment}"></textarea>
              <div class="d-flex flex-column gap-1">
                <button class="ct-btn-post ct-btn-post-reply" style="padding:7px 14px;font-size:0.8rem;"
                        data-parent-id="${comment.id_comment}">Send</button>
                <button class="ct-btn-cancel-reply" data-comment-id="${comment.id_comment}"
                  style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.78rem;text-align:center;">Cancel</button>
              </div>
            </div>
          </div>

          <!-- Replies -->
          ${
            replies.length > 0
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

// Keep export for backward compat (not used internally anymore)
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
  return [d?.video_url, repo, d?.preview_photo_url].filter(Boolean).length;
}

function gradeClass(g) {
  if (g >= 90) return "ct-grade-excellent";
  if (g >= 75) return "ct-grade-good";
  if (g >= 60) return "ct-grade-average";
  return "ct-grade-low";
}

function gradeLabel(g) {
  if (g >= 90) return "Excellent";
  if (g >= 75) return "Good";
  if (g >= 60) return "Average";
  return "Below Average";
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
// Comments — carga, renderiza y gestiona interacciones
// ─────────────────────────────────────────────────────────────
export async function loadComments(projectId, user) {
  const list = document.getElementById("commentsList");
  const postBtn = document.getElementById("postCommentBtn");
  const input = document.getElementById("commentInput");
  if (!list || !postBtn || !input) return;

  const currentUserId = user?.id_user ?? null;

  // Lazy-import to avoid circular deps
  const { getComments, postComment, deleteComment } =
    await import("../services/api.js");

  // ── Render helpers ──────────────────────────────────────────
  function renderAll(comments) {
    if (comments.length === 0) {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:0.875rem;text-align:center;padding:1rem 0;">No comments yet. Be the first!</p>`;
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

  // ── Load comments ───────────────────────────────────────────
  async function refresh() {
    try {
      const comments = await getComments(projectId);
      renderAll(Array.isArray(comments) ? comments : []);
    } catch {
      list.innerHTML = `<p style="color:var(--text-muted);font-size:0.875rem;">Could not load comments.</p>`;
    }
  }

  setLoading(true);
  await refresh();

  // ── Post top-level comment ──────────────────────────────────
  // Clone button + input to strip any previously attached listeners
  // Guards against loadComments being called more than once on the same DOM.
  const activeBtn = postBtn.cloneNode(true);
  postBtn.replaceWith(activeBtn);
  const activeInput = input.cloneNode(true);
  input.replaceWith(activeInput);

  activeBtn.addEventListener("click", async () => {
    const text = activeInput.value.trim();
    if (!text) return;

    activeBtn.disabled = true;
    activeBtn.textContent = "Posting...";

    try {
      await postComment({ projectId, comment: text });
      activeInput.value = "";
      await refresh();
    } catch (err) {
      alert(err?.message ?? "Could not post comment.");
    } finally {
      activeBtn.disabled = false;
      activeBtn.textContent = "Post Comment";
    }
  });

  // Allow Ctrl+Enter to submit
  activeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      activeBtn.click();
    }
  });

  // ── Handlers inside the list (reply, delete) ─────────────────
  function attachListHandlers() {
    // Reply toggle
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

    // Cancel reply
    list.querySelectorAll(".ct-btn-cancel-reply").forEach((btn) => {
      btn.addEventListener("click", () => {
        const commentId = btn.dataset.commentId;
        const box = document.getElementById(`reply-box-${commentId}`);
        if (box) box.classList.add("d-none");
        const replyInput = document.getElementById(`reply-input-${commentId}`);
        if (replyInput) replyInput.value = "";
      });
    });

    // Send reply
    list.querySelectorAll(".ct-btn-post-reply").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const parentId = parseInt(btn.dataset.parentId);
        const replyInput = document.getElementById(`reply-input-${parentId}`);
        const text = replyInput?.value?.trim();
        if (!text) return;

        btn.disabled = true;
        btn.textContent = "Sending...";

        try {
          await postComment({
            projectId,
            comment: text,
            parentCommentId: parentId,
          });
          await refresh();
        } catch (err) {
          alert(err?.message ?? "Could not post reply.");
          btn.disabled = false;
          btn.textContent = "Send";
        }
      });
    });

    // Delete comment or reply
    list.querySelectorAll(".ct-btn-delete-comment").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const commentId = btn.dataset.commentId;
        if (!confirm("Delete this comment?")) return;

        btn.disabled = true;
        try {
          await deleteComment(commentId);
          await refresh();
        } catch (err) {
          alert(err?.message ?? "Could not delete comment.");
          btn.disabled = false;
        }
      });

      // Hover style
      btn.addEventListener("mouseenter", () => {
        btn.style.color = "#ef4444";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.color = "#ccc";
      });
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Activity — carga y renderiza el brief del proyecto
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
    container.innerHTML = "<p>Error loading Activity.</p>";
  }
}

function _renderMarkdown(md) {
  let h = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Code blocks
  h = h.replace(/```[\s\S]*?```/g, (m) => {
    const code = m.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
    return "<pre><code>" + code + "</code></pre>";
  });

  // Inline code
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headings
  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  h = h.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  h = h.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // HR
  h = h.replace(/^---$/gm, "<hr>");

  // Bold / italic
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*([^\n]+?)\*/g, "<em>$1</em>");

  // Lists — group consecutive <li> into <ul>
  h = h.replace(/^- (.+)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>.*?<\/li>\n?)+/gs, (m) => "<ul>" + m + "</ul>");

  // Paragraphs
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
  const feedbackEl = document.getElementById("eval-feedback");
  if (!container || !submitBtn) return;
  if (userRole !== "CODER") display.classList.remove("d-none");

  const ROLE_AREA_MAP = {
    TL_DEVELOPMENT: "DEVELOPMENT",
    TL_SOFT_SKILLS: "SOFT_SKILLS",
    TL_ENGLISH: "ENGLISH",
  };
  // ADMIN sees all areas; TLs only see their assigned area
  const allowedArea = ROLE_AREA_MAP[userRole] ?? null;

  const {
    getRubricsByEvent,
    submitEvaluations,
    getMyEvaluationsForProject,
    calculateProjectGrades,
  } = await import("../services/api.js");

  let rubrics = [];
  let existingEvals = [];

  try {
    [rubrics, existingEvals] = await Promise.all([
      getRubricsByEvent(eventId),
      getMyEvaluationsForProject(projectId),
    ]);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">Could not load rubrics.</p>`;
    return;
  }

  // Filter to only the area this TL is responsible for
  if (allowedArea) {
    rubrics = rubrics.filter((r) => r.area === allowedArea);
  }

  if (!rubrics.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">No rubrics configured for this event.</p>`;
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

  const membersHtml = evaluableMembers
    .map((member) => {
      const initial = member.name?.charAt(0)?.toUpperCase() ?? "?";
      const avatarHtml = member.github_avatar_url
        ? `<img src="${member.github_avatar_url}" alt="${member.name}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
        : `<div class="ct-avatar-sm flex-shrink-0" style="width:32px;height:32px;font-size:0.8rem;">${initial}</div>`;

      const rubricsHtml = rubrics
        .map((rubric) => {
          const key = `${rubric.id_rubric}_${member.id_user}`;
          const existing = existingMap[key];
          const optionsHtml = rubric.grades
            .map(
              (g) =>
                `<option value="${g.id_grade}" data-score="${g.score}" ${existing?.gradeId === g.id_grade ? "selected" : ""}>${g.score} pts</option>`,
            )
            .join("");

          return `
            <div class="mb-2">
              <label style="font-size:0.78rem;color:var(--text-muted);font-weight:500;display:block;margin-bottom:3px;">
                ${rubric.name}
                <span style="opacity:0.6;">(${rubric.area} · peso: ${rubric.weight})</span>
              </label>
              <select
                class="form-select form-select-sm eval-select"
                data-rubric-id="${rubric.id_rubric}"
                data-member-id="${member.id_user}"
                style="font-size:0.82rem;border-radius:8px;">
                <option value="">-- Puntaje --</option>
                ${optionsHtml}
              </select>
              <textarea
                class="form-control mt-1 eval-feedback-input"
                data-rubric-id="${rubric.id_rubric}"
                data-member-id="${member.id_user}"
                placeholder="Feedback (opcional)"
                rows="2"
                style="font-size:0.78rem;border-radius:8px;resize:none;">${existing?.feedback ?? ""}</textarea>
            </div>
          `;
        })
        .join("");

      return `
        <div class="mb-4 pb-3" style="border-bottom:1px solid var(--border);">
          <div class="d-flex align-items-center gap-2 mb-3">
            ${avatarHtml}
            <div>
              <p class="mb-0" style="font-weight:600;font-size:0.875rem;">${member.name}</p>
              <p class="mb-0" style="font-size:0.75rem;color:var(--text-muted);">${member.team_role ?? "Member"}</p>
            </div>
          </div>
          ${rubricsHtml}
        </div>
      `;
    })
    .join("");

  container.innerHTML =
    membersHtml ||
    `<p style="color:var(--text-muted);font-size:0.85rem;">No hay miembros para evaluar.</p>`;
  submitBtn.classList.remove("d-none");

  submitBtn.onclick = async () => {
    const selects = container.querySelectorAll(".eval-select");
    const evaluations = [];
    let valid = true;

    selects.forEach((sel) => {
      const gradeId = parseInt(sel.value);
      const memberId = parseInt(sel.dataset.memberId);
      const rubricId = sel.dataset.rubricId;

      if (!sel.value) {
        sel.style.border = "1.5px solid #ef4444";
        valid = false;
        return;
      }
      sel.style.border = "";

      const feedbackInput = container.querySelector(
        `.eval-feedback-input[data-rubric-id="${rubricId}"][data-member-id="${memberId}"]`,
      );
      const feedback = feedbackInput?.value?.trim() || null;
      evaluations.push({ evaluatedUserId: memberId, gradeId, feedback });
    });

    if (!valid) {
      feedbackEl.innerHTML = `<span style="color:#ef4444;">Por favor puntúa todas las rúbricas para cada miembro.</span>`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";
    feedbackEl.innerHTML = "";

    try {
      await submitEvaluations(projectId, evaluations);
      // Recalculate grades immediately so results reflect this TL's input
      try {
        await calculateProjectGrades(projectId);
      } catch (_) {
        // Silently ignore — grades will recalculate on next submission
      }
      feedbackEl.innerHTML = `<span style="color:var(--color-success);font-weight:600;">✓ Evaluaciones enviadas exitosamente.</span>`;
      submitBtn.textContent = "Actualizar Evaluaciones";
    } catch (err) {
      feedbackEl.innerHTML = `<span style="color:#ef4444;">${err?.message ?? "Error al enviar evaluaciones."}</span>`;
      submitBtn.textContent = "Enviar Evaluaciones";
    } finally {
      submitBtn.disabled = false;
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Deliverables — maneja submit y edición de video / preview photo
// ─────────────────────────────────────────────────────────────

export function initDeliverables(projectId) {
  // Field → camelCase key for the API
  const fieldMap = {
    video_url: "videoUrl",
    preview_photo_url: "previewPhotoUrl",
  };

  const editableFields = ["video_url", "preview_photo_url"];

  async function saveField(field, url, btnEl) {
    const apiKey = fieldMap[field];
    if (!apiKey) return;

    const original = btnEl.innerHTML;
    btnEl.disabled = true;
    btnEl.innerHTML = `<span class="ct-spinner" style="width:12px;height:12px;border-width:2px;"></span>`;

    try {
      const { apiFetch } = await import("../services/api.js");
      await apiFetch(`/projects/${projectId}/deliverables`, {
        method: "PUT",
        body: { [apiKey]: url || null },
      });

      const row = document.querySelector(
        `.ct-deliverable-item[data-field="${field}"]`,
      );
      if (row) {
        if (url) {
          row.classList.remove("ct-deliverable-pending");
          row.classList.add("ct-deliverable-done");

          const statusEl = row.querySelector(".ct-del-status");
          if (statusEl) {
            statusEl.className = "ct-del-status ct-status-done";
            statusEl.textContent = "Submitted";
          }

          // Replace the entire actions div with the post-submit state
          const actionsDiv = row.querySelector(".ct-deliverable-actions");
          if (actionsDiv) {
            actionsDiv.innerHTML = `
              <a href="${url}" target="_blank" rel="noopener" class="ct-btn-open">Open</a>
              <button class="ct-btn-icon ct-btn-edit" data-field="${field}" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <div class="d-none align-items-center gap-2 ct-edit-row" id="edit-${field}">
                <input type="url" class="ct-url-input ct-edit-input" data-field="${field}"
                       value="${url}" placeholder="New URL…" />
                <button class="ct-btn-icon ct-btn-submit ct-edit-submit" data-field="${field}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <button class="ct-btn-cancel ct-edit-cancel" data-field="${field}">✕</button>
              </div>
            `;
            attachRowHandlers(actionsDiv);
          }
        } else {
          row.classList.remove("ct-deliverable-done");
          row.classList.add("ct-deliverable-pending");
        }
      }

      _refreshDeliverableCount();
    } catch (err) {
      alert(err?.message ?? "Could not save deliverable.");
      btnEl.innerHTML = original;
    } finally {
      btnEl.disabled = false;
    }
  }

  function _refreshDeliverableCount() {
    const badge = document.querySelector(".ct-deliverables-count");
    const done = document.querySelectorAll(".ct-deliverable-done").length;
    if (badge) badge.textContent = `${done}/3 submitted`;
    _updateSubmitBtn(done);
  }

  function _updateSubmitBtn(done) {
    const btn = document.getElementById("submitProjectBtn");
    if (!btn) return;
    const allDone = done >= 3;
    btn.disabled = !allDone;
    btn.style.opacity = allDone ? "1" : "0.4";
    btn.style.cursor = allDone ? "pointer" : "not-allowed";
  }

  function _attachSubmitHandler() {
    const btn = document.getElementById("submitProjectBtn");
    if (!btn) return;

    // Enable if already 3 done on init
    const done = document.querySelectorAll(".ct-deliverable-done").length;
    _updateSubmitBtn(done);

    btn.addEventListener("click", async () => {
      if (
        !confirm(
          "Submit your project for evaluation? This action cannot be undone — you won't be able to edit deliverables or change team members after this.",
        )
      )
        return;

      btn.disabled = true;
      btn.textContent = "Submitting…";

      try {
        const { submitProject } = await import("../services/api.js");
        await submitProject(projectId);

        // Insert success badge before removing the button
        btn.insertAdjacentHTML(
          "afterend",
          `
          <div class="d-flex align-items-center gap-2 mt-3 pt-3" style="border-top:1px solid var(--border);">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" style="width:15px;height:15px;flex-shrink:0">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span style="font-size:0.82rem;font-weight:600;color:var(--color-success);">Project submitted — under review</span>
          </div>
        `,
        );
        btn.remove();

        // Lock all deliverable edit controls
        document
          .querySelectorAll(
            ".ct-btn-edit, .ct-btn-submit, .ct-url-input, .ct-edit-cancel",
          )
          .forEach((el) => {
            el.style.display = "none";
          });

        // Hide Add Member and Leave Team buttons
        document.getElementById("addMemberBtn")?.remove();
        document.getElementById("leaveTeamBtn")?.remove();
      } catch (err) {
        alert(err?.message ?? "Could not submit project.");
        btn.disabled = false;
        btn.textContent = "Submit Project";
      }
    });
  }

  function attachRowHandlers(scope) {
    // Submit new URL (pending state)
    scope
      .querySelectorAll(".ct-btn-submit:not(.ct-edit-submit)")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const field = btn.dataset.field;
          if (!editableFields.includes(field)) return;
          const input = scope.querySelector(
            `.ct-url-input:not(.ct-edit-input)[data-field="${field}"]`,
          );
          const url = input?.value?.trim();
          if (!url) {
            input?.focus();
            return;
          }
          await saveField(field, url, btn);
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

    // Submit edit
    scope.querySelectorAll(".ct-edit-submit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const field = btn.dataset.field;
        if (!editableFields.includes(field)) return;
        const input = document.querySelector(
          `.ct-edit-input[data-field="${field}"]`,
        );
        const url = input?.value?.trim();
        if (!url) {
          input?.focus();
          return;
        }
        await saveField(field, url, btn);
      });
    });
  }

  // Attach handlers to each deliverable actions div independently
  document.querySelectorAll(".ct-deliverable-item").forEach((row) => {
    const actionsDiv = row.querySelector(".ct-deliverable-actions");
    if (actionsDiv) attachRowHandlers(actionsDiv);
  });

  _attachSubmitHandler();
}
