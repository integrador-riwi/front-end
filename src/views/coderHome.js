import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar";
import { renderCoderTeam } from "./coderTeam.js";
import { renderCoderNoTeam, setupAIAnalysis } from "./coderNoTeam.js";
import { getUser } from "../utils/auth";

export default class CoderHome {
  constructor(router, { user, team } = {}) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.user = getUser();

    this.searchQuery = "";
    
    this.aiResult = null;
    this.isAnalyzing = false;
    
    // Store form values to prevent clearing on re-render
    this.formData = {
      teamName: "",
      projectTopic: ""
    };

    this.teams = [
      {
        id: 1,
        name: "Quantum Leap",
        description:
          "Exploring quantum computing algorithms for financial models.",
        status: "full",
        members: [
          { id: 1, name: "Alice", avatar: "A" },
          { id: 2, name: "Bob", avatar: "B" },
          { id: 3, name: "Carol", avatar: "C" },
          { id: 4, name: "Dave", avatar: "D" },
        ],
        maxMembers: 6,
      },
      {
        id: 2,
        name: "Alpha Squad",
        description: "Building a React Native app for campus navigation.",
        status: "open",
        members: [
          { id: 5, name: "Emma", avatar: "E" },
          { id: 6, name: "Frank", avatar: "F" },
        ],
        maxMembers: 6,
      },
      {
        id: 3,
        name: "Data Miners",
        description:
          "Machine Learning project focusing on social media sentiment analysis.",
        status: "pending",
        members: [
          { id: 7, name: "Grace", avatar: "G" },
          { id: 8, name: "Henry", avatar: "H" },
          { id: 9, name: "Ivy", avatar: "I" },
        ],
        maxMembers: 6,
      },
    ];
  }

  // ─────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────
  render() {
    const app = document.getElementById("app");

    const content = this.team
      ? renderCoderTeam({ user: this.user, team: this.team })
      : renderCoderNoTeam({
          user: this.user,
          teams: this.getFilteredTeams(),
          searchQuery: this.searchQuery,
          availableCount: this.getAvailableCount(),
          formData: this.formData,
          analyzeSimilarity: this.aiResult !== null || this.isAnalyzing,
          aiResult: this.aiResult,
          isAnalyzing: this.isAnalyzing
        });

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="coder-home-main">
        ${content}
      </main>
    `;

    this.navbar.attachEventHandlers();
    this.attachEventHandlers();
    
    if (!this.team) {
      setupAIAnalysis(this);
    }
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────
  getFilteredTeams() {
    if (!this.searchQuery.trim()) return this.teams;
    const q = this.searchQuery.toLowerCase();
    return this.teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }

  getAvailableCount() {
    return this.teams.filter((t) => t.status === "open").length;
  }

  // ─────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────
  attachEventHandlers() {
    // ── No-team view handlers ──
    document
      .getElementById("createTeamForm")
      ?.addEventListener("submit", (e) => this.handleCreateTeam(e));

    document.getElementById("teamSearch")?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.render();
    });

    document.querySelectorAll(".btn-join").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.handleJoinTeam(btn.dataset.teamId),
      );
    });

    // ── Team view handlers ──
    const btnProjectSettings = document.querySelector(".btn-project-settings");
    if (btnProjectSettings) {
      btnProjectSettings.addEventListener("click", (e) => {
        const route = e.currentTarget.dataset.route;
        if (route) {
          this.router.navigate(route);
        }
      });
    }
  }

  // ─────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────
  handleCreateTeam(e) {
    e.preventDefault();
    const teamName = document.getElementById("teamName").value;
    const projectTopic = document.getElementById("projectTopic").value;
    // TODO: replace with API call
    console.log("Creating team:", { teamName, projectTopic });
    alert(`Team "${teamName}" created successfully!`);
  }
  
  handleJoinTeam(teamId) {
    console.log("Join team:", teamId);
  }
}
