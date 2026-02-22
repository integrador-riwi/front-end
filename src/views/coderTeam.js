export function renderCoderTeam({ user, team }) {
  const { name: teamName, members = [], project = null } = team;

  const grade        = project?.grade               ?? null;
  const dueDate      = project?.final_delivery_date ?? "TBD";
  const projectName  = project?.name                ?? teamName;
  const projectDesc  = project?.description         ?? "No description yet.";
  const deliverables = project?.deliverables        ?? null;

  return `
    <div class="container-xl px-3 px-md-4 py-4">
      <div class="row g-4 align-items-start">

        <!-- ══ LEFT COLUMN ══ -->
        <div class="col-12 col-lg-8 d-flex flex-column gap-4">

          <!-- Project hero -->
          <div class="ct-hero-card rounded-4 p-4">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <span class="ct-eyebrow">${teamName.toUpperCase()}</span>
              <span class="ct-badge-active">Active</span>
            </div>

            <h1 class="ct-hero-title mb-1">${projectName}</h1>
            <p class="ct-hero-tagline mb-0">${projectDesc}</p>

            <div class="d-flex flex-wrap gap-4 pt-3 mt-3 ct-stats-divider">

              <!-- Grade -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Grade</span>
                ${grade !== null ? `
                  <div class="d-flex align-items-center gap-2">
                    <span class="ct-stat-value">${grade.toFixed(1)}</span>
                    <span class="ct-grade-chip ${gradeClass(grade)}">${gradeLabel(grade)}</span>
                  </div>
                  <div class="ct-grade-track mt-1">
                    <div class="ct-grade-bar ${gradeClass(grade)}" style="width:${grade}%"></div>
                  </div>
                  <span class="ct-grade-hint">${grade} / 100</span>
                ` : `<span class="ct-not-graded">Not graded yet</span>`}
              </div>

              <!-- Due date -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Due Date</span>
                <span class="ct-stat-value">${formatDate(dueDate)}</span>
              </div>

              <!-- Team -->
              <div class="d-flex flex-column gap-1">
                <span class="ct-stat-label">Team</span>
                <div class="ct-mini-avatars mt-1">
                  ${members.slice(0, 3).map(m => `
                    <div class="ct-mini-avatar">${m.name.charAt(0)}</div>
                  `).join("")}
                  ${members.length > 3
                    ? `<div class="ct-mini-avatar ct-mini-more">+${members.length - 3}</div>`
                    : ""}
                </div>
              </div>

            </div>
          </div>

          <!-- Deliverables -->
          <div class="bg-white rounded-4 p-4 ct-card-shadow">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="ct-section-title mb-0">Project Deliverables</h2>
              <span class="ct-pill-badge">${deliverableCount(deliverables)} / 3 submitted</span>
            </div>
            ${renderDeliverables(deliverables)}
          </div>

          <!-- Comments -->
          <div class="bg-white rounded-4 p-4 ct-card-shadow">
            <h2 class="ct-section-title d-flex align-items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6b5cff" stroke-width="2"
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

        </div>

        <!-- ══ RIGHT COLUMN ══ -->
        <div class="col-12 col-lg-4">
          <div class="bg-white rounded-4 p-4 ct-card-shadow">
            <h2 class="ct-section-title mb-3">Project Team</h2>
            <ul class="list-unstyled d-flex flex-column gap-1 mb-0">
              ${members.map((m, i) => `
                <li class="ct-member-item d-flex align-items-center gap-3 rounded-3 px-2 py-2">
                  <div class="ct-avatar-md ct-avatar-color-${i % 4} flex-shrink-0">${m.name.charAt(0)}</div>
                  <div class="overflow-hidden">
                    <p class="ct-member-name text-truncate mb-0">${m.name}</p>
                    <p class="ct-member-role mb-0">${m.team_role ?? m.role ?? "Member"}</p>
                  </div>
                </li>
              `).join("")}
            </ul>

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
          </div>
        </div>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Deliverables
// ─────────────────────────────────────────────────────────────
function renderDeliverables(d) {
  const items = [
    { key: "video_url",         icon: "", label: "Pitch Video",   url: d?.video_url         ?? null, color: "#eaa2fc" },
    { key: "repo_url",          icon: "", label: "Repository",    url: d?.repo_url          ?? null, color: "#5acca4" },
    { key: "preview_photo_url", icon: "", label: "Preview Photo", url: d?.preview_photo_url ?? null, color: "#e6ca52" },
  ];

  return `
    <div class="d-flex flex-column gap-2">
      ${items.map(item => `
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
              <span class="ct-del-status ${item.url ? "ct-status-done" : "ct-status-pending"}">
                ${item.url ? "Submitted" : "Pending"}
              </span>
            </div>
          </div>

          <!-- Right: actions -->
          <div class="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap justify-content-end">
            ${item.url ? `
              <a href="${item.url}" target="_blank" rel="noopener" class="ct-btn-open">Open</a>
              <button class="ct-btn-icon ct-btn-edit" data-field="${item.key}" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            ` : `
              <div class="d-flex align-items-center gap-2">
                <input type="url" class="ct-url-input" data-field="${item.key}" placeholder="Paste URL…" />
                <button class="ct-btn-icon ct-btn-submit" data-field="${item.key}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            `}

            <!-- Edit row hidden by default -->
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
          </div>

        </div>
      `).join("")}
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

function deliverableCount(d) {
  if (!d) return 0;
  return [d.video_url, d.repo_url, d.preview_photo_url].filter(Boolean).length;
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
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}