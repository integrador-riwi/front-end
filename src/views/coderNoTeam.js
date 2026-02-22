export function renderCoderNoTeam({ user, teams, searchQuery, availableCount }) {
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
                     placeholder="e.g., The Code Wizards" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="projectTopic">Project Description</label>
              <textarea id="projectTopic" class="form-textarea"
                        placeholder="Briefly describe what your team wants to work on..."></textarea>
            </div>
            <button type="submit" class="btn-create-team">
              Create Team
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

          <div class="team-list">
            ${teams.length === 0
              ? `<p style="text-align:center;color:#9ca3b8;padding:2rem;">
                   No teams found matching "${searchQuery}"
                 </p>`
              : teams.map(team => renderTeamCard(team)).join("")
            }
          </div>
        </section>

      </div>
    </div>
  `;
}

function renderTeamCard(team) {
  const isFull    = team.status === "full";
  const isPending = team.status === "pending";

  return `
    <article class="team-card">
      <div class="team-card-header">
        <div class="team-card-title-row">
          <h3 class="team-card-title">${team.name}</h3>
          <span class="team-badge ${team.status}">${isFull ? "FULL" : "OPEN"}</span>
        </div>
      </div>
      <p class="team-card-description">${team.description}</p>
      <div class="team-card-footer">
        <div class="team-members">
          <div class="member-avatars">
            ${team.members.slice(0, 6).map(m => `
              <div class="member-avatar">${m.avatar}</div>
            `).join("")}
          </div>
          <span class="member-count">${team.members.length}/${team.maxMembers} Members</span>
        </div>
        ${isFull
          ? `<button class="btn-full" disabled>Full Team</button>`
          : isPending
            ? `<button class="btn-pending" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Pending
               </button>`
            : `<button class="btn-join" data-team-id="${team.id}">Request to Join</button>`
        }
      </div>
    </article>
  `;
}