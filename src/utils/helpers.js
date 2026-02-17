import AdminDashboard from "../components/dashboards/AdminDashboard.js";
import CoderDashboard from "../components/dashboards/CoderDashboard.js";
import StaffDashboard from "../components/dashboards/StaffDashboard.js";
import TLDashboard    from "../components/dashboards/TLDashboard.js";


//dashboard helpers
const DASHBOARD_MAP = {
  ADMIN:          AdminDashboard,
  TL_DEVELOPMENT: TLDashboard,
  TL_SOFT_SKILLS: TLDashboard,
  TL_ENGLISH:     TLDashboard,
  CODER:          CoderDashboard,
  STAFF:          StaffDashboard,
};

export function getDashboardForRole(role, user) {
  const DashboardClass = DASHBOARD_MAP[role];
  return DashboardClass ? new DashboardClass(user) : null;
}


//Login form helpers
export function renderErrorBox(message) {
  if (!message) return "";
  return `
    <div class="error-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
      </svg>
      ${message}
    </div>
  `;
}



export const getInitials = (name) => {
  return (name ?? "U")
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getCurrentUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};


export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};