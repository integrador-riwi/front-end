export function renderCoderTeam({ user, team, isLeader = false }) {
  const { name: teamName, members = [], project = null } = team;

  const grade = project?.grade ?? null;
  const dueDate = project?.final_delivery_date ?? "TBD";
  const projectName = project?.name ?? teamName;
  const projectDesc = project?.description ?? "No description yet.";
  const deliverables = project?.deliverables ?? null;

  const repoUrl = project?.repo_url ?? deliverables?.repo_url ?? null;

  return `
    <div class="container-xl px-3 px-md-4 py-4">
      <div class="row g-4 align-items-start coderteam-container">

        <!-- ══ LEFT COLUMN ══ -->
        <div class="col-12 col-lg-8 d-flex flex-column gap-4">

          <!-- Project hero -->
          <div class="ct-hero-card rounded-4 p-4">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            </div>

            <h1 class="ct-hero-title mb-1">${projectName}</h1>
            <p class="ct-hero-tagline mb-0">${projectDesc}</p>

            <div class="d-flex flex-wrap gap-4 pt-3 mt-3 ct-stats-divider">

              <!-- Grade -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Grade</span>
                ${
                  grade !== null
                    ? `
                  <div class="d-flex align-items-center gap-2">
                    <span class="ct-stat-value">${grade.toFixed(1)}</span>
                    <span class="ct-grade-chip ${gradeClass(grade)}">${gradeLabel(grade)}</span>
                  </div>
                  <div class="ct-grade-track mt-1">
                    <div class="ct-grade-bar ${gradeClass(grade)}" style="width:${grade}%"></div>
                  </div>
                  <span class="ct-grade-hint">${grade} / 100</span>
                `
                    : `<span class="ct-not-graded">Not graded yet</span>`
                }
              </div>

              <!-- Due date -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Due Date</span>
                <span class="ct-stat-value">${formatDate(dueDate)}</span>
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

          <!-- Activity -->
          <div class="bg-white rounded-4 p-4 ct-card-shadow">
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


          <!-- Comments -->
          <!--
          <div class="bg-white rounded-4 p-4 ct-card-shadow">
            <h2 class="ct-section-title d-flex align-items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                   style="width:16px;height:16px;flex-shrink:0">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Comments
            </h2>

            <div class="d-flex gap-3 align-items-start mb-2">
              <div class="ct-avatar-sm flex-shrink-0">${user?.name?.charAt(0) ?? "U"}</div>
              <textarea id="commentInput" class="ct-comment-input flex-grow-1"
                        placeholder="Share your thoughts..."></textarea>
            </div>
            <div class="d-flex justify-content-end mb-4 ps-5">
              <button class="ct-btn-post" id="postCommentBtn">Post Comment</button>
            </div>

            <div class="d-flex flex-column gap-3" id="commentsList"></div>
          </div>
          -->

        </div>

        <!-- ══ RIGHT COLUMN ══ -->
        <div class="col-12 col-lg-4 coderteam-right-col d-flex flex-column gap-4">
          <div class="bg-white rounded-4 p-4 ct-card-shadow d-flex flex-column">
            
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
                  <div class="ct-avatar-md ct-avatar-color-${i % 4} flex-shrink-0">${m.name.charAt(0)}</div>
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
              isLeader
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
          </div>
        </div>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Deliverables
// ─────────────────────────────────────────────────────────────
function renderDeliverables(d, repoUrl) {
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
          <div class="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
            ${
              item.url
                ? `
              <a href="${item.url}" target="_blank" rel="noopener" class="ct-btn-open">Open</a>
              ${
                item.key !== "repo_url"
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
                : `
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
            }

            <!-- Edit row hidden by default (not shown for repo) -->
            ${
              item.key !== "repo_url"
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

// comment helper
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
// Activity — carga y renderiza el brief del proyecto
// ─────────────────────────────────────────────────────────────

export async function loadProjectBrief() {
  const container = document.getElementById("project-brief-content");
  if (!container) return;

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
