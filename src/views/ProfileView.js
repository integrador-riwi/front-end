import "../assets/styles/profile.css";
import "../assets/styles/coderTeam.css";
import { getCurrentUser } from "../utils/helpers.js";
import Navbar from "../components/navbar/navbar.js";
import { getProfile } from "../services/api.js";
import { getInitials } from "../utils/helpers.js";

export default class ProfileView {
    constructor(router) {
        this.router = router;
        this.user = getCurrentUser();
        this.navbar = new Navbar(router);
        this.navbar.setActiveRoute("profile");

        this.profileDetails = null;
        this.isLoading = true;
        this.error = null;
    }

    async loadProfile() {
        try {
            if (!this.user?.id) throw new Error("User ID not found");
            this.profileDetails = await getProfile(this.user.id);
        } catch (err) {
            console.error("Failed to load profile", err);
            this.error = "Could not load your profile details at this time.";
            // if api fails
            this.profileDetails = this.profileDetails || {
                github_url: "",
                description: "A passionate coder.",
                clan: "None"
            }
        } finally {
            this.isLoading = false;
            this.render();
        }
    }

    render() {
        const app = document.getElementById("app");

        // Initial loading state
        if (this.isLoading) {
            app.innerHTML = `
              ${this.navbar.render()}
              <main class="coder-home-main d-flex justify-content-center align-items-center" style="min-height: 100vh;">
                  <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                  </div>
              </main>
           `;
            this.navbar.attachEventHandlers();
            this.loadProfile();
            return;
        }

        app.innerHTML = `
      ${this.navbar.render()}
      <main class="coder-home-main profile-viewport">
        <div class="container-xl px-3 px-md-4 py-5">
            <div class="row g-4 justify-content-center mt-2">
                
              <!-- Left Column: Avatar & Summary -->
              <div class="col-12 col-md-5 col-lg-4 d-flex flex-column gap-4">
                 <div class="bg-white rounded-4 p-4 ct-card-shadow text-center position-relative overflow-hidden">
                   <div class="profile-card-topbar"></div>
                   <div class="profile-avatar mb-3 d-flex align-items-center justify-content-center mx-auto mt-2">
                     <span class="profile-initials">${getInitials(this.user?.name ?? "User")}</span>
                   </div>
                   <h2 class="profile-name mb-1">${this.user?.name ?? "User Name"}</h2>
                   <p class="profile-role mb-3">${this.user?.role ?? "CODER"}</p>
                   <div class="clan-badge mx-auto d-inline-block">
                     Clan: ${this.profileDetails?.clan || "N/A"}
                   </div>
                 </div>
              </div>

              <!-- Right Column: Details -->
          
              <div class="col-12 col-md-7 col-lg-8 d-flex flex-column gap-4">
              
                 <div class="bg-white rounded-4 p-4 ct-card-shadow text-start">
                 
                   <h2 class="ct-section-title mb-4 pb-3 border-bottom profile-about-title">About Me</h2>
                   
                   ${this.error ? `<div class="alert alert-danger" role="alert">${this.error}</div>` : ""}

                   <div class="mb-4">
                     <label class="ct-stat-label d-block mb-1">Description</label>
                     <div class="ct-stat-value fs-6 fw-normal text-muted p-3 rounded profile-info-box">${this.profileDetails?.description || "No description provided."}</div>
                   </div>

                   <div class="mb-4">
                       <label class="ct-stat-label d-block mb-1">Email</label>
                       <div class="ct-stat-value fs-6 fw-normal text-muted p-3 rounded profile-info-box">${this.user?.email ?? "user@example.com"}</div>
                   </div>

                   <div>
                     <label class="ct-stat-label d-block mb-1">GitHub URL</label>
                     ${this.profileDetails?.github_url ? `
                      <div class="profile-card-topbar"></div>
                     <div class="p-3 rounded profile-info-box">
                       <a href="${this.profileDetails.github_url}" target="_blank" class="ct-stat-value fs-6 fw-normal d-inline-flex align-items-center gap-2 profile-info-link">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                           <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                         </svg>
                         ${this.profileDetails.github_url}
                       </a>
                     </div>
                     
                     ` : `<div class="p-3 rounded profile-info-box"><p class="ct-stat-value fs-6 fw-normal text-muted m-0">No GitHub URL provided.</p></div>`}
                   </div>
                 </div>
              </div>
            </div>
        </div>
      </main>
    `;

        this.navbar.attachEventHandlers();
        this.attachEventHandlers();
    }



    attachEventHandlers() {
        // profile specific interactivity if we want  to be crative later :)
    }
}
