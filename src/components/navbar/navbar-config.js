import { icons } from "../../utils/icons.js";

const TL_BASE_LINKS = [
  { label: "Dashboard", route: "dashboard", icon: "calendar" },
  { label: "Projects to Grade", route: "evaluations", icon: "edit" },
  { label: "My Evaluations", route: "my-evaluations", icon: "check" },
  { label: "Teams & Projects", route: "projects", icon: "globe" },
  { label: "Events", route: "events", icon: "calendar" },
];

const ADMIN_BASE_LINKS = [
  { label: "Events", route: "events", icon: "calendar" },
  { label: "New Event", route: "events/create", icon: "plus" },
];

const ADMIN_EVENT_LINKS = [
  { label: "Back to Events", route: "events", icon: "calendar" },
  { label: "Metrics", route: "dashboard", icon: "metrics" },
  { label: "Projects", route: "projects", icon: "globe" },
  { label: "Ranking", route: "ranking", icon: "ranking" },
  { label: "Voting", route: "qr", icon: "qr" },
  { label: "Finalists", route: "finalists", icon: "trophy" },
];

export const NAV_LINKS_BY_ROLE = {
  // ADMIN: [
  //   { label: "Events", route: "events", icon: "calendar" },
  //   { label: "New Event", route: "events/create", icon: "plus" },
  //   { label: "Event Details", route: "details", icon: "details" },
  //   { label: "Teams & Projects", route: "projects", icon: "globe" },
  //   { label: "Rubrics", route: "rubrics", icon: "bulb" },
  //   { label: "Evaluation Rules", route: "rules", icon: "settings" },
  //   { label: "Ranking", route: "ranking", icon: "ranking" },
  //   { label: "QR Voting", route: "qr", icon: "qr" },
  //   { label: "Finalists & Votes", route: "finalists", icon: "trophy" },
  // ],
  ADMIN: ADMIN_BASE_LINKS,
  TL_DEVELOPMENT: TL_BASE_LINKS,
  TL_SOFT_SKILLS: TL_BASE_LINKS,
  TL_ENGLISH: TL_BASE_LINKS,
  CODER: [
    { label: "My Project", route: "coderHome", icon: "globe" },
    { label: "Teams & Projects", route: "projects", icon: "bulb" },
    // { label: "My Grades", route: "my-grades", icon: "bulb" },
    // { label: "Events", route: "events", icon: "calendar" },
    // { label: "Project Settings", route: "projectSettings", icon: "calendar" },
  ],
  STAFF: [
    { label: "Dashboard", route: "dashboard", icon: "calendar" },
    { label: "Events", route: "events", icon: "calendar" },
    { label: "Teams & Projects", route: "projects", icon: "globe" },
    { label: "Final Results", route: "final-results", icon: "trophy" },
  ],
};

export const ROLE_LABELS = {
  ADMIN: "Admin Manager",
  TL_DEVELOPMENT: "Dev Team Leader",
  TL_SOFT_SKILLS: "Soft Skills TL",
  TL_ENGLISH: "English TL",
  CODER: "Coder",
  STAFF: "Staff",
};

export const getNavLinks = (role) => {
  if (role === "ADMIN") {
    const eventId = localStorage.getItem("currentEventId");

    if (eventId) {
      return ADMIN_EVENT_LINKS
    }

    return ADMIN_BASE_LINKS;
  }

  return NAV_LINKS_BY_ROLE[role] ?? [];
};

export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] ?? "User";
};

export const getIcon = (iconName) => {
  return icons[iconName]?.();
};
