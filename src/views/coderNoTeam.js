import { searchSimilarProjects } from "../services/api.js";

export function renderCoderNoTeam({ user, teams, searchQuery, availableCount, formData, analyzeSimilarity, aiResult, isAnalyzing }) {
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
                     value="${formData?.teamName || ''}" 
                     required />
            </div>
            <div class="form-group">
              <label class="form-label" for="projectTopic">Project Description</label>
              <textarea id="projectTopic" class="form-textarea"
                        placeholder="Briefly describe what your team wants to work on...">${formData?.projectTopic || ''}</textarea>
              
              <!-- AI Analysis Result -->
              <div id="aiAnalysisResult" class="ai-analysis-box" style="display: ${analyzeSimilarity ? 'block' : 'none'};">
                ${isAnalyzing ? `
                  <div class="ai-loading">
                    <span class="ai-spinner"></span>
                    Analizando...
                  </div>
                ` : aiResult ? `
                  <div class="ai-result ${aiResult.class}">
                    <span class="ai-icon">${aiResult.icon}</span>
                    <span class="ai-message">${aiResult.message}</span>
                  </div>
                ` : ''}
              </div>
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

// Export for use in coderHome
export function setupAIAnalysis(instance) {
  const teamNameInput = document.getElementById('teamName');
  const projectTopicInput = document.getElementById('projectTopic');
  
  if (!teamNameInput || !projectTopicInput) return;
  
  const analyze = debounce(async () => {
    const name = teamNameInput?.value.trim() || '';
    const description = projectTopicInput?.value.trim() || '';
    
    // Save form data
    instance.formData = {
      teamName: teamNameInput.value,
      projectTopic: projectTopicInput.value
    };
    
    if (name.length < 3 || description.length < 10) {
      instance.aiResult = null;
      instance.isAnalyzing = false;
      const resultBox = document.getElementById('aiAnalysisResult');
      if (resultBox) resultBox.style.display = 'none';
      return;
    }
    
    instance.isAnalyzing = true;
    instance.aiResult = null;
    
    // Show loading
    const resultBox = document.getElementById('aiAnalysisResult');
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.innerHTML = `
        <div class="ai-loading">
          <span class="ai-spinner"></span>
          Analizando...
        </div>
      `;
    }
    
    const query = `${name}. ${description}`;
    
    try {
      const response = await searchSimilarProjects(query, 3, 0.3, null);
      const data = response.data?.data || [];
      
      instance.isAnalyzing = false;
      
      if (data.length === 0) {
        instance.aiResult = {
          class: 'unique',
          icon: '✓',
          message: 'Tu proyecto es <strong>único</strong>'
        };
      } else {
        const maxSimilarity = Math.max(...data.map(p => p.similarity));
        const similarProject = data.find(p => p.similarity === maxSimilarity);
        const percent = Math.round(maxSimilarity * 100);
        
        if (percent >= 70) {
          instance.aiResult = {
            class: 'very-similar',
            icon: '🚨',
            message: `Tu proyecto es <strong>muy similar</strong> a: <br><em>${similarProject.project_name}</em> (${percent}% coincidencia)`
          };
        } else {
          instance.aiResult = {
            class: 'similar',
            icon: '⚠️',
            message: `Tu proyecto <strong>se parece</strong> a: <br><em>${similarProject.project_name}</em> (${percent}% coincidencia)`
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
      console.error('Error analyzing similarity:', error);
      instance.isAnalyzing = false;
      
      if (resultBox) {
        if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('invalid')) {
          resultBox.innerHTML = `
            <div class="ai-result error">
              <span class="ai-icon">⚙️</span>
              <span class="ai-message">Configura tu API key de OpenAI en el backend.</span>
            </div>
          `;
        } else {
          resultBox.style.display = 'none';
        }
      }
    }
  }, 800);
  
  teamNameInput?.addEventListener('input', analyze);
  projectTopicInput?.addEventListener('input', analyze);
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
