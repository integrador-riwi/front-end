import "../assets/styles/coderHome.css";
import "../assets/styles/coderTeam.css";
import Navbar from "../components/navbar/navbar";
import { renderCoderTeam }   from "./coderTeam.js";
import { renderCoderNoTeam } from "./coderNoTeam.js";
import { getUser } from "../utils/auth";

export default class CoderHome {
  constructor(router, { user, team } = {}) {
    this.router = router;
    this.navbar = new Navbar(router);
    this.user   = getUser();
    this.team   = this.team = {
  name: "Alpha Squad",
  members: [{ name: "Alice", team_role: "LEADER" }, { name: "Bob", team_role: "MEMBER" }],
  project: {
    name: "Campus Navigator",
    description: "React Native app for campus navigation.",
    grade: 87.5,
    final_delivery_date: "2026-03-15",
    deliverables: {
      video_url: "https://youtube.com/watch?v=xxx",
      presentation_url: "https://slides.google.com/xxx",
      repo_url: "https://github.com/team/repo",
      preview_photo_url: null,
    }
  }
}, 
    this.searchQuery = "";

    // Available teams. It is show only when there is no team 
    this.teams = [
      {
        id: 1,
        name: "Quantum Leap",
        description: "Exploring quantum computing algorithms for financial models.",
        status: "full",
        members: [
          { id: 1, name: "Alice", avatar: "A" },
          { id: 2, name: "Bob",   avatar: "B" },
          { id: 3, name: "Carol", avatar: "C" },
          { id: 4, name: "Dave",  avatar: "D" },
        ],
        maxMembers: 6,
      },
      {
        id: 2,
        name: "Alpha Squad",
        description: "Building a React Native app for campus navigation.",
        status: "open",
        members: [
          { id: 5, name: "Emma",  avatar: "E" },
          { id: 6, name: "Frank", avatar: "F" },
        ],
        maxMembers: 6,
      },
      {
        id: 3,
        name: "Data Miners",
        description: "Machine Learning project focusing on social media sentiment analysis.",
        status: "pending",
        members: [
          { id: 7, name: "Grace", avatar: "G" },
          { id: 8, name: "Henry", avatar: "H" },
          { id: 9, name: "Ivy",   avatar: "I" },
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
          user:           this.user,
          teams:          this.getFilteredTeams(),
          searchQuery:    this.searchQuery,
          availableCount: this.getAvailableCount(),
        });

    app.innerHTML = `
      ${this.navbar.render()}
      <main class="coder-home-main">
        ${content}
      </main>
    `;

    this.navbar.attachEventHandlers();
    this.attachEventHandlers();
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────
  getFilteredTeams() {
    if (!this.searchQuery.trim()) return this.teams;
    const q = this.searchQuery.toLowerCase();
    return this.teams.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  }

  getAvailableCount() {
    return this.teams.filter(t => t.status === "open").length;
  }

  // ─────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────
  attachEventHandlers() {
    // ── No-team view handlers ──
    document.getElementById("createTeamForm")?.addEventListener("submit", (e) => this.handleCreateTeam(e));

    document.getElementById("teamSearch")?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.render();
    });

    document.querySelectorAll(".btn-join").forEach(btn => {
      btn.addEventListener("click", () => this.handleJoinTeam(btn.dataset.teamId));
    });

  }

  // ─────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────
  handleCreateTeam(e) {
    e.preventDefault();
    const teamName     = document.getElementById("teamName").value;
    const projectTopic = document.getElementById("projectTopic").value;
    // TODO: replace with API call
    console.log("Creating team:", { teamName, projectTopic });
    alert(`Team "${teamName}" created successfully!`);
  }
 }
 
