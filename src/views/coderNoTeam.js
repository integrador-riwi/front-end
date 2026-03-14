import { searchSimilarProjects } from "../services/api.js";

export function renderCoderNoTeam({
  user,
  teams,
  searchQuery,
  activeFilter,
  availableCount,
  formData,
  analyzeSimilarity,
  aiResult,
  isAnalyzing,
  createTeamState,
  isLoading,
  selectedEvent,
}) {
  const {
    isCreating = false,
    error: createTeamError = "",
    success: createTeamSuccess = "",
  } = createTeamState || {};
  
  return `
    <div class="team-selection-container">

      <header class="team-selection-header">
        <h1 class="team-selection-title">Find your squad.</h1>
        <p class="team-selection-subtitle">
          Welcome, ${user?.name ?? "Coder"}. To start the Capstone Project, you need to
          establish a new team or join an existing group of peers.
        </p>
      </header>

      <div class="team-selection-grid">

        <!-- LEFT: Create New Team -->
        <aside class="create-team-card">
          <div class="create-team-header">
            <div class="create-team-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <h2 class="create-team-title">Start a New Team</h2>
          </div>
          <p class="create-team-description">
            Take the lead. Create a team and invite your classmates to join you.
            You'll be the team administrator.
          </p>
          <form id="createTeamForm">
            <div class="form-group">
              <label class="form-label" for="teamName">Team Name</label>
              <input type="text" id="teamName" class="form-input"
                     placeholder="e.g., The Code Wizards" 
                      value="${formData?.teamName || ""}" 
                     required />
            </div>
            <div class="form-group">
              <label class="form-label" for="projectTopic">Project Description</label>
              <textarea id="projectTopic" class="form-textarea"
                        placeholder="Briefly describe what your team wants to work on...">${formData?.projectTopic || ""}</textarea>
              
              <!-- AI Analysis Result -->
              <div id="aiAnalysisResult" class="ai-analysis-box" style="display: ${analyzeSimilarity ? "block" : "none"};">
                ${
                  isAnalyzing
                    ? `
                  <div class="ai-loading">
                    <span class="ai-spinner"></span>
                    Analyzing...
                  </div>
                `
                    : aiResult
                      ? `
                  <div class="ai-result ${aiResult.class}">
                    <span class="ai-icon">${aiResult.icon}</span>
                    <span class="ai-message">${aiResult.message}</span>
                  </div>
                `
                      : ""
                }
              </div>
            </div>
            <button type="submit" class="btn-create-team" ${isCreating ? "disabled" : ""}>
              ${isCreating ? "Creating..." : "Create Team"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </form>
        </aside>

        <!-- RIGHT: Join Existing Team -->
        <section class="join-team-section">
          <div class="join-team-header">
            <div class="join-team-header-left">
              <div class="join-team-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h2 class="join-team-title">Join an Existing Team</h2>
            </div>
            <span class="available-count">${availableCount} Available</span>
          </div>

          <div class="search-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="teamSearch" class="search-input"
                   placeholder="Search by team name or topic..."
                   value="${searchQuery}" />
          </div>

          <div class="team-filters">
            <button class="filter-btn ${!activeFilter || activeFilter === "all" ? "active" : ""}" data-filter="all">All</button>
            <button class="filter-btn ${activeFilter === "open" ? "active" : ""}" data-filter="open">
              <span class="filter-dot open"></span> Open
            </button>
            <button class="filter-btn ${activeFilter === "pending" ? "active" : ""}" data-filter="pending">
              <span class="filter-dot pending"></span> Pending
            </button>
            <button class="filter-btn ${activeFilter === "full" ? "active" : ""}" data-filter="full">
              <span class="filter-dot full"></span> Full
            </button>
          </div>

          <div class="team-list">
            ${
              isLoading
                ? renderSkeletonCards(4)
                : teams.length === 0
                  ? `<div class="teams-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      <p>${searchQuery || activeFilter !== "all" ? "No teams match your filters." : "No teams available right now."}</p>
                    </div>`
                  : teams.map((team) => renderTeamCard(team)).join("")
            }
          </div>
        </section>

      </div>
    </div>
    <div id="overlay"></div>
  `;
}

export function renderSkeletonCards(count = 3) {
  console.log('coder no team')
  return Array.from(
    { length: count },
    () => `
    <article class="team-card skeleton">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line desc"></div>
      <div class="skeleton-line desc short"></div>
      <div class="skeleton-leader">
        <div class="skeleton-circle"></div>
        <div class="skeleton-line name"></div>
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-avatars">
          <div class="skeleton-circle sm"></div>
          <div class="skeleton-circle sm"></div>
          <div class="skeleton-circle sm"></div>
        </div>
        <div class="skeleton-btn"></div>
      </div>
    </article>
  `,
  ).join("");
}

export function renderTeamCard(team) {
  const isFull = team.status === "full";
  const isPending = team.status === "pending";

  // Leader initials fallback if no avatar
  const leaderInitials = team.leaderName
    ? team.leaderName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const leaderAvatar = team.leaderAvatarUrl
    ? `<img src="${team.leaderAvatarUrl}" alt="${team.leaderName}" class="leader-avatar-img" />`
    : `<div class="leader-avatar-initials">${leaderInitials}</div>`;

  // Member avatars (real GitHub photos, max 4 shown)
  const memberAvatars = (team.members ?? [])
    .slice(0, 4)
    .map((m) => {
      if (m.github_avatar_url) {
        return `<img src="${m.github_avatar_url}" alt="${m.name}" class="member-avatar-img" title="${m.name}" />`;
      }
      const initials = m.name
        ? m.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "?";
      return `<div class="member-avatar-initials" title="${m.name}">${initials}</div>`;
    })
    .join("");

  const extraCount = (team.memberCount ?? 0) - 4;
  const extraBubble =
    extraCount > 0
      ? `<div class="member-avatar-extra">+${extraCount}</div>`
      : "";

  // Slot dots
  const slotDots = Array.from(
    { length: team.maxMembers },
    (_, i) =>
      `<span class="slot-dot ${i < team.memberCount ? "filled" : ""}"></span>`,
  ).join("");

  const description = team.description
    ? escapeHtml(team.description)
    : `<span class="no-description">No project description yet.</span>`;

  return `
    <article class="team-card ${team.status}">
      <div class="team-card-header">
        <div class="team-card-title-row">
          <h3 class="team-card-title">${escapeHtml(team.name)}</h3>
          <span class="team-badge ${team.status}">
            ${isFull ? "FULL" : isPending ? "PENDING" : "OPEN"}
          </span>
        </div>
      </div>

      <p class="team-card-description">${description}</p>

      <div class="team-card-leader">
        ${leaderAvatar}
        <span class="leader-label">Led by <strong>${escapeHtml(team.leaderName ?? "Unknown")}</strong></span>
      </div>

      <div class="team-card-footer">
        <div class="team-members">
          <div class="member-avatars-row">
            ${memberAvatars}${extraBubble}
          </div>
          <div class="slot-dots">${slotDots}</div>
          <span class="member-count">
            ${team.memberCount}/${team.maxMembers}
            ${!isFull ? `<span class="slots-left">· ${team.slotsLeft} left</span>` : ""}
          </span>
        </div>

        ${
          isFull
            ? `<button class="btn-full" disabled>Full Team</button>`
            : isPending
              ? `<button class="btn-pending" disabled>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Request Sent
                </button>`
              : `<button class="btn-join" data-team-id="${team.id}">Request to Join</button>`
        }
      </div>
    </article>
  `;
}

// Export for use in coderHome
export function setupAIAnalysis(instance) {
  const teamNameInput = document.getElementById("teamName");
  const projectTopicInput = document.getElementById("projectTopic");

  if (!teamNameInput || !projectTopicInput) return;

  const analyze = debounce(async () => {
    const name = teamNameInput?.value.trim() || "";
    const description = projectTopicInput?.value.trim() || "";

    // Save form data
    instance.formData = {
      teamName: teamNameInput.value,
      projectTopic: projectTopicInput.value,
    };

    if (name.length < 3 || description.length < 10) {
      instance.aiResult = null;
      instance.isAnalyzing = false;
      const resultBox = document.getElementById("aiAnalysisResult");
      if (resultBox) resultBox.style.display = "none";
      return;
    }

    instance.isAnalyzing = true;
    instance.aiResult = null;

    // Show loading
    const resultBox = document.getElementById("aiAnalysisResult");
    if (resultBox) {
      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div class="ai-loading">
          <span class="ai-spinner"></span>
          Analyzing...
        </div>
      `;
    }

    const query = `${name}. ${description}`;

    try {
      const response = await searchSimilarProjects(query, 3, 0.6, null);
      const data = response.data?.data || [];

      instance.isAnalyzing = false;

      if (data.length === 0) {
        instance.aiResult = {
          class: "unique",
          icon: "✓",
          message: "Your project is <strong>unique</strong>",
        };
      } else {
        const maxSimilarity = Math.max(...data.map((p) => p.similarity));
        const similarProject = data.find((p) => p.similarity === maxSimilarity);
        const percent = Math.round(maxSimilarity * 100);

        if (percent >= 80) {
          instance.aiResult = {
            class: "very-similar",
            icon: "🚨",
            message: `Your project is <strong>very similar</strong> to: <br><em>${similarProject.project_name}</em> (${percent}% similarity)`,
          };
        } else {
          instance.aiResult = {
            class: "similar",
            icon: "⚠️",
            message: `Your project <strong>is similar</strong> to: <br><em>${similarProject.project_name}</em> (${percent}% similarity)`,
          };
        }
      }

      if (resultBox) {
        resultBox.innerHTML = `
          <div class="ai-result ${instance.aiResult.class}">
            <span class="ai-icon">${instance.aiResult.icon}</span>
            <span class="ai-message">${instance.aiResult.message}</span>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error analyzing similarity:", error);
      instance.isAnalyzing = false;

      if (resultBox) {
        if (
          error.message?.includes("API key") ||
          error.message?.includes("401") ||
          error.message?.includes("invalid")
        ) {
          resultBox.innerHTML = `
            <div class="ai-result error">
              <span class="ai-icon">⚙️</span>
              <span class="ai-message">Configure your OpenAI API key in the backend.</span>
            </div>
          `;
        } else {
          resultBox.style.display = "none";
        }
      }
    }
  }, 800);

  teamNameInput?.addEventListener("input", analyze);
  projectTopicInput?.addEventListener("input", analyze);
}

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
