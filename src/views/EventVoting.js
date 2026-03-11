import Navbar from "../components/navbar/navbar.js";
import Header from "../components/header/header.js";
import { getEventById } from "../services/api-events.js";
import { getUser } from "../utils/auth.js";
import "../assets/styles/dashboard.css";
import "../assets/styles/components.css";
import "../assets/styles/qr-voting.css";

export default class QRVoting {
  constructor(router, params = {}) {
    this.router = router;
    this.user = getUser();
    this.navbar = new Navbar(router);
    this.header = new Header(router);
    this.eventId = params.eventId || null;
    this.event = null;
    this.loading = true;
    this.error = null;
    this.ranking = [null, null, null]; // 1st, 2nd, 3rd
  }

  //   async fetchCurrentEvent() {
  //     try {
  //       this.loading = true;

  //       if (!this.eventId) {
  //         throw new Error('Event ID not provided');
  //       }

  //       const response = await getEventById(this.eventId);
  //       this.event = response.data || response;

  //     } catch (err) {
  //       console.error("Failed to fetch event:", err);
  //       this.error = err.message || "Error loading event. Please try again later.";
  //     } finally {
  //       this.loading = false;
  //     }
  //   }

  async fetchCurrentEvent() {
    try {
      this.loading = true;

      //  SI NO HAY EVENT ID → SIMULAMOS
      if (!this.eventId) {
        console.warn("No Event ID provided. Using mock event.");

        this.event = {
          id: "mock-1",
          title: "Demo Final Pitch Event",
          description: "This is a simulated event for development purposes.",
          finalists: [
            {
              id: "p1",
              project_name: "EcoTrack",
              team_name: "Green Innovators",
            },
            {
              id: "p2",
              project_name: "HealthSync",
              team_name: "Vital Coders",
            },
            {
              id: "p3",
              project_name: "EduSmart",
              team_name: "Future Minds",
            },
            {
              id: "p4",
              project_name: "EcoTrack",
              team_name: "Green Innovators",
            },
            {
              id: "p5",
              project_name: "HealthSync",
              team_name: "Vital Coders",
            },
            {
              id: "p6",
              project_name: "EduSmart",
              team_name: "Future Minds",
            },
          ],
        };

        return; //
      }

      const response = await getEventById(this.eventId);
      this.event = response.data || response;
    } catch (err) {
      console.error("Failed to fetch event:", err);
      this.error =
        err.message || "Error loading event. Please try again later.";
    } finally {
      this.loading = false;
    }
  }

  renderVotingView() {
    const slotsContainer = document.getElementById("ranking-slots");
    const teamsContainer = document.getElementById("available-teams");

    if (!slotsContainer || !teamsContainer || !this.event) return;

    slotsContainer.innerHTML = this.renderRankingSlots();
    teamsContainer.innerHTML = this.renderAvailableTeams(this.event.finalists);

    this.attachTeamSelection();
  }

  renderLoading() {
    return `
      <div class="d-flex justify-content-center align-items-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
  }

  renderError(message) {
    return `
      <div class="alert alert-danger rounded-4 mt-4" role="alert">
        ${message}
      </div>
    `;
  }

  renderRankingSlots() {
    const labels = [
      { place: "2nd Place", medal: "SILVER", class: "slot-2 small-slot" },
      { place: "Winner", medal: "GOLD", class: "slot-1 big-slot" },
      { place: "3rd Place", medal: "BRONZE", class: "slot-3 small-slot" },
    ];

    return labels
      .map((slot, index) => {
        const team = this.ranking[index];

        return `
      <div class="col-4">
        <div class="slot ${slot.class}">
          ${
            team
              ? `
              <strong>${team.team_name}</strong>
              <small>${slot.medal}</small>
            `
              : `
              ${index === 1 ? "1" : index === 0 ? "2" : "3"}
              <br><small>${slot.medal}</small>
            `
          }
        </div>
      </div>
    `;
      })
      .join("");
  }

  renderFinalistsSection(finalists = []) {
  if (!finalists.length) {
    return `<div class="text-muted">No teams available</div>`;
  }

  return finalists
    .map(team => this.renderTeamCard(team))
    .join("");
}

  renderTeamCard(team, { selectable = false } = {}) {
  if (!team) return "";

  const initials = (team.team_name || "NA")
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return `
    <div class="col-md-6 col-lg-4">
      <div class="teamF-card ${selectable ? "selectable-team" : ""} 
           d-flex flex-column align-items-center"
           ${selectable ? `data-id="${team.id}"` : ""}>
           
        <div class="team-avatar">
          ${initials}
        </div>

        <div class="mt-2 text-center">
          <strong>${team.team_name || "Unnamed Team"}</strong><br>
          <small class="text-muted">
            ${team.project_name || "Project"}
          </small>
        </div>

      </div>
    </div>
  `;
}

  renderAvailableTeams(finalists = []) {
  if (!finalists.length) {
    return `<div class="text-muted">No teams available</div>`;
  }

  // 🔥 Comparación profesional por ID
  const rankedIds = this.ranking
    .filter(Boolean)
    .map(team => team.id);

  const available = finalists.filter(
    team => !rankedIds.includes(team.id)
  );

  if (!available.length) {
    return `<div class="text-muted">All teams have been ranked</div>`;
  }

  return available
    .map(team => this.renderTeamCard(team, { selectable: true }))
    .join("");
}

attachTeamSelection() {
  document.querySelectorAll(".selectable-team").forEach((card) => {
    card.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const team = this.event.finalists.find((t) => t.id == id);

      if (!team) return;

      // Toggle logic: if already ranked, remove it
      const rankedIndex = this.ranking.findIndex(t => t?.id === team.id);
      if (rankedIndex !== -1) {
        this.ranking[rankedIndex] = null;
        this.renderVotingView();
        return;
      }

      // Add logic: fill first available slot in 2-1-3 order
      const fillOrder = [1, 0, 2];
      const emptyIndex = fillOrder.find(
        (index) => this.ranking[index] === null
      );

      if (emptyIndex !== undefined) {
        this.ranking[emptyIndex] = team;
        this.renderVotingView();
      } else {
        // Show subtle alert if all slots filled
        alert("You have already selected 3 finalists. Remove one to add another.");
      }
    });
  });

  const launchBtn = document.querySelector(".btn-primary-custom.shadow");
  if (launchBtn) {
    launchBtn.addEventListener("click", () => {
      const selectedTeams = this.ranking.filter(Boolean);
      if (selectedTeams.length < 3) {
        alert("Please select 1st, 2nd, and 3rd place before launching.");
        return;
      }
      
      launchBtn.disabled = true;
      launchBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Launching Session...`;
      
      setTimeout(() => {
        alert(`Voting session launched successfully for: \n1st: ${this.ranking[1].team_name}\n2nd: ${this.ranking[0].team_name}\n3rd: ${this.ranking[2].team_name}`);
        launchBtn.innerHTML = "Voting Session Active";
        launchBtn.classList.remove("btn-primary-custom");
        launchBtn.classList.add("btn-success");
      }, 1500);
    });
  }
}

  async render() {
    const app = document.getElementById("app");

    const template = await fetch("../../pages/admin_qr.html").then((r) =>
      r.text(),
    );

    app.innerHTML = `
    ${this.navbar.render()}
    ${this.header.render()}
    <main class="dashboard-main">
      ${template}
    </main>
  `;

    this.header.mountBreadcrumb();
    this.navbar.attachEventHandlers();

    await this.fetchCurrentEvent();

    if (this.error) return;

    const finalistsContainer = document.getElementById("finalists-container");

    if (!finalistsContainer) {
      console.error("Finalists container not found");
      return;
    }

    this.renderVotingView();

    const availableTeamsContainer = document.getElementById("available-teams"); 

    if (!availableTeamsContainer) {
      console.error("Available teams container not found");
      return;
    }

    availableTeamsContainer.innerHTML = this.renderAvailableTeams(
      this.event?.finalists || [],
    );
    
    this.attachTeamSelection(); // Re-attach handlers after full render
  }

  attachEventHandlers() {
    document.querySelectorAll(".view-project-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;

        if (id) {
          this.router.navigate(`/projects/${id}`);
        }
      });
    });
  }
}
